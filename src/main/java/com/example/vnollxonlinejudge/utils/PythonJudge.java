package com.example.vnollxonlinejudge.utils;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.errors.MinioException;

import java.lang.reflect.Field;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

public class PythonJudge {
    private static final String MINIO_ENDPOINT = "http://localhost:9000";
    private static final String MINIO_ACCESS_KEY = "vnollxvnollx";
    private static final String MINIO_SECRET_KEY = "vnollxvnollxvnollx";
    private static final String MINIO_BUCKET_NAME = "problem";

    private static final MinioClient minioClient = MinioClient.builder()
            .endpoint(MINIO_ENDPOINT)
            .credentials(MINIO_ACCESS_KEY, MINIO_SECRET_KEY)
            .build();

    static class SyntaxCheckResult {
        final boolean isValid;
        final String error;

        public SyntaxCheckResult(boolean isValid, String error) {
            this.isValid = isValid;
            this.error = error;
        }
    }

    static class RunResult {
        final boolean success;
        final String output;
        final String error;
        final long timeUsedMs;
        final long maxMemoryUsedMB;

        public RunResult(boolean success, String output, String error,
                         long timeUsedMs, long maxMemoryUsedMB) {
            this.success = success;
            this.output = output;
            this.error = error;
            this.timeUsedMs = timeUsedMs;
            this.maxMemoryUsedMB = maxMemoryUsedMB;
        }
    }

    static class JudgeResult {
        final String result;
        final String details;
        final long maxTimeUsedMs;
        final long maxMemoryUsedMB;

        public JudgeResult(String result, String details,
                           long maxTimeUsedMs, long maxMemoryUsedMB) {
            this.result = result;
            this.details = details;
            this.maxTimeUsedMs = maxTimeUsedMs;
            this.maxMemoryUsedMB = maxMemoryUsedMB;
        }
    }

    // 语法检查（替代编译）
    public static SyntaxCheckResult checkSyntax(String codeFilePath) {
        try {
            Process process = new ProcessBuilder("python", "-m", "py_compile", codeFilePath)
                    .redirectErrorStream(true)
                    .start();

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            int exitCode = process.waitFor();
            //System.out.println(output.toString().trim());
            return new SyntaxCheckResult(
                    exitCode == 0,
                    exitCode == 0 ? null : "编译错误"
            );
        } catch (IOException | InterruptedException e) {
            return new SyntaxCheckResult(false, e.getMessage());
        }
    }

    // 执行Python代码
    public static RunResult runCode(String codeFilePath, String inputData,
                                    long timeLimitMs, long memoryLimitMB) {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<?> future = null;
        Process process = null;
        long startTime = 0;
        final long[] maxMemory = {0};

        try {
            ProcessBuilder pb = new ProcessBuilder("python", codeFilePath);
            process = pb.start();
            startTime = System.currentTimeMillis();

            // 输入处理
            try (OutputStream stdin = process.getOutputStream()) {
                stdin.write(inputData.getBytes());
                stdin.flush();
            }

            // 输出收集
            StringBuilder output = new StringBuilder();
            StringBuilder error = new StringBuilder();

            // 启动输出读取线程
            Process finalProcess = process;
            Thread outputThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(finalProcess.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        output.append(line).append("\n");
                    }
                } catch (IOException e) {
                    error.append("输出读取错误: ").append(e.getMessage());
                }
            });
            outputThread.start();

            // 启动错误流读取线程
            Process finalProcess2 = process;
            Thread errorThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(finalProcess2.getErrorStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        error.append(line).append("\n");
                    }
                } catch (IOException e) {
                    error.append("错误流读取错误: ").append(e.getMessage());
                }
            });
            errorThread.start();

            // 内存监控线程
            final long pid = getPid(process);
            Process finalProcess1 = process;
            Thread memoryMonitor = new Thread(() -> {
                try {
                    while (finalProcess1.isAlive()) {
                        long usage = getMemoryUsage(pid);
                        maxMemory[0] = Math.max(maxMemory[0], usage);
                        if (memoryLimitMB > 0 && usage > memoryLimitMB) {
                            finalProcess1.destroy();
                            break;
                        }
                        Thread.sleep(10);
                    }
                } catch (Exception e) {
                    error.append("内存监控错误: ").append(e.getMessage());
                }
            });
            memoryMonitor.start();

            // 超时控制
            Process finalProcess3 = process;
            future = executor.submit(() -> {
                try {
                    finalProcess3.waitFor();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });

            future.get(timeLimitMs, TimeUnit.MILLISECONDS);
            long endTime = System.currentTimeMillis();

            outputThread.join();
            errorThread.join();
            memoryMonitor.join();

            return new RunResult(
                    process.exitValue() == 0,
                    output.toString().trim(),
                    error.toString().trim(),
                    endTime - startTime,
                    maxMemory[0]
            );
        } catch (TimeoutException e) {
            process.destroyForcibly();
            return new RunResult(false, null, "时间超出限制",
                    timeLimitMs, maxMemory[0]);
        } catch (Exception e) {
            return new RunResult(false, null, "执行错误: " + e.getMessage(),
                    0, 0);
        } finally {
            if (future != null) future.cancel(true);
            executor.shutdown();
            if (process != null) process.destroyForcibly();
        }
    }

    // 判题核心逻辑
    public static JudgeResult judgeCode(String code, String testCasePath,
                                        long timeLimitMs, long memoryLimitMB) {
        String codeFilePath = "submission.py";
        try {
            Files.write(new File(codeFilePath).toPath(), code.getBytes());

            // 语法检查
            SyntaxCheckResult syntaxResult = checkSyntax(codeFilePath);
            if (!syntaxResult.isValid) {
                return new JudgeResult("语法错误", syntaxResult.error, 0, 0);
            }

            // 下载测试用例
            File tempZipFile = File.createTempFile("testcases", ".zip");
            try (InputStream is = minioClient.getObject(GetObjectArgs.builder()
                    .bucket(MINIO_BUCKET_NAME)
                    .object(testCasePath)
                    .build())) {
                Files.copy(is, tempZipFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            }

            List<String> failedCases = new ArrayList<>();
            long maxTime = 0;
            long maxMemory = 0;

            try (ZipFile zipFile = new ZipFile(tempZipFile)) {
                int caseNum = 1;
                while (true) {
                    String inputName = caseNum + ".in";
                    String outputName = caseNum + ".out";

                    ZipEntry inputEntry = zipFile.getEntry(inputName);
                    ZipEntry outputEntry = zipFile.getEntry(outputName);
                    if (inputEntry == null || outputEntry == null) break;

                    String input = readZipEntry(zipFile, inputEntry);
                    String expected = readZipEntry(zipFile, outputEntry);

                    RunResult runResult = runCode(codeFilePath, input,
                            timeLimitMs, memoryLimitMB);

                    maxTime = Math.max(maxTime, runResult.timeUsedMs);
                    maxMemory = Math.max(maxMemory, runResult.maxMemoryUsedMB);

                    if (!runResult.success) {
                        String error = runResult.error;
                        if (error.contains("时间超限")) {
                            failedCases.add("时间超出限制");
                        } else if (error.contains("内存超限")) {
                            failedCases.add("内存超出限制");
                        } else {
                            failedCases.add("运行时错误");
                        }
                    } else if (!runResult.output.equals(expected)) {
                        failedCases.add("答案错误");
                    }
                    caseNum++;
                }
            }

            if (failedCases.isEmpty()) {
                return new JudgeResult("通过", "答案正确", maxTime, maxMemory);
            } else {
                return new JudgeResult("未通过", String.join("\n", failedCases),
                        maxTime, maxMemory);
            }
        } catch (MinioException | InvalidKeyException | NoSuchAlgorithmException e) {
            return new JudgeResult("系统错误", "测试用例下载失败", 0, 0);
        } catch (IOException e) {
            return new JudgeResult("系统错误", "文件操作失败", 0, 0);
        } finally {
            new File(codeFilePath).delete();
        }
    }

    // 辅助方法
    private static long getPid(Process process) {
        try {
            Class<?> clazz = Class.forName("java.lang.UNIXProcess");
            Field pidField = clazz.getDeclaredField("pid");
            pidField.setAccessible(true);
            return pidField.getLong(process);
        } catch (Exception e) {
            return -1;
        }
    }

    private static long getMemoryUsage(long pid) throws IOException, InterruptedException {
        String os = System.getProperty("os.name").toLowerCase();
        if (os.contains("win")) {
            Process ps = new ProcessBuilder(
                    "powershell", "-Command",
                    "(Get-Process -Id " + pid + ").WorkingSet64 / 1MB"
            ).start();
            ps.waitFor();
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(ps.getInputStream()))) {
                String line = br.readLine();
                return line != null ? (long) Double.parseDouble(line.trim()) : 0;
            }
        } else {
            Process ps = new ProcessBuilder("ps", "-o", "rss=", "-p",
                    String.valueOf(pid)).start();
            ps.waitFor();
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(ps.getInputStream()))) {
                String line = br.readLine();
                return line != null ? Long.parseLong(line.trim()) / 1024 : 0;
            }
        }
    }

    private static String readZipEntry(ZipFile zipFile, ZipEntry entry)
            throws IOException {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(zipFile.getInputStream(entry)))) {
            StringBuilder content = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }
            return content.toString().trim();
        }
    }

    public static String Check(String code, String testCasePath,
                               int timeLimitMs, int memoryLimitMB) {
        JudgeResult result = judgeCode(code, testCasePath, timeLimitMs, memoryLimitMB);
        return result.details+result.maxTimeUsedMs;
    }
}