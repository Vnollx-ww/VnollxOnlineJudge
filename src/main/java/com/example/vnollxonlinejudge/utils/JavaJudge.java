package com.example.vnollxonlinejudge.utils;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.errors.MinioException;

import java.io.*;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
// D:\minio.exe server D:\minio --console-address :9090
public class JavaJudge {
    private static final String MINIO_ENDPOINT = "http://localhost:9000";
    private static final String MINIO_ACCESS_KEY = "vnollxvnollx";
    private static final String MINIO_SECRET_KEY = "vnollxvnollxvnollx";
    private static final String MINIO_BUCKET_NAME = "problem";

    private static final MinioClient minioClient = MinioClient.builder()
            .endpoint(MINIO_ENDPOINT)
            .credentials(MINIO_ACCESS_KEY, MINIO_SECRET_KEY)
            .build();

    static class CompileResult {
        private final boolean success;
        private final String error;

        public CompileResult(boolean success, String error) {
            this.success = success;
            this.error = error;
        }

        public boolean isSuccess() {
            return success;
        }

        public String getError() {
            return error;
        }
    }

    static class RunResult {
        private final boolean success;
        private final String output;
        private final String error;
        private final long timeUsedMs;
        private final long maxMemoryUsedMB;

        public RunResult(boolean success, String output, String error, long timeUsedMs, long maxMemoryUsedMB) {
            this.success = success;
            this.output = output;
            this.error = error;
            this.timeUsedMs = timeUsedMs;
            this.maxMemoryUsedMB = maxMemoryUsedMB;
        }

        public boolean isSuccess() {
            return success;
        }

        public String getOutput() {
            return output;
        }

        public String getError() {
            return error;
        }

        public long getTimeUsedMs() {
            return timeUsedMs;
        }

        public long getMaxMemoryUsedMB() {
            return maxMemoryUsedMB;
        }
    }

    static class JudgeResult {
        private final String result;
        private final String details;
        private final long maxTimeUsedMs;
        private final long maxMemoryUsedMB;

        public JudgeResult(String result, String details, long maxTimeUsedMs, long maxMemoryUsedMB) {
            this.result = result;
            this.details = details;
            this.maxTimeUsedMs = maxTimeUsedMs;
            this.maxMemoryUsedMB = maxMemoryUsedMB;
        }

        public String getResult() {
            return result;
        }

        public String getDetails() {
            return details;
        }

        public long getMaxTimeUsedMs() {
            return maxTimeUsedMs;
        }

        public long getMaxMemoryUsedMB() {
            return maxMemoryUsedMB;
        }
    }

    public static CompileResult compileCode(String codeFilePath) {
        try {
            ProcessBuilder pb = new ProcessBuilder("javac", "-encoding", "UTF-8", codeFilePath);
            Process process = pb.start();

            BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream()));
            StringBuilder errorOutput = new StringBuilder();
            String line;
            while ((line = errorReader.readLine()) != null) {
                errorOutput.append(line).append("\n");
            }

            int exitCode = process.waitFor();
            if (exitCode != 0) {
                return new CompileResult(false, "编译错误");
            }
            return new CompileResult(true, null);
        } catch (IOException | InterruptedException e) {
            return new CompileResult(false, e.getMessage());
        }
    }

    public static RunResult runCode(String className, String inputData, long timeLimitMs, long memoryLimitMB) {
        Process process = null;
        AtomicLong maxMemory = new AtomicLong(0);
        long startTime = 0;
        long endTime = 0;

        try {
            ProcessBuilder pb = new ProcessBuilder("java", "-cp", ".", className);
            process = pb.start();
            startTime = System.currentTimeMillis();

            try (OutputStream stdin = process.getOutputStream()) {
                stdin.write(inputData.getBytes());
            }

            StringBuilder outputBuffer = new StringBuilder();
            StringBuilder errorBuffer = new StringBuilder();

            Process finalProcess = process;
            Thread outputThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(finalProcess.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        outputBuffer.append(line).append("\n");
                    }
                } catch (IOException e) {
                    errorBuffer.append("输出读取错误: ").append(e.getMessage()).append("\n");
                }
            });
            outputThread.start();

            Process finalProcess1 = process;
            Thread errorThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(finalProcess1.getErrorStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        errorBuffer.append(line).append("\n");
                    }
                } catch (IOException e) {
                    errorBuffer.append("错误流读取错误: ").append(e.getMessage()).append("\n");
                }
            });
            errorThread.start();

            final long pid = getPid(process);
            final boolean[] isTimeout = {false};
            final boolean[] isMemoryExceeded = {false};

            Process finalProcess2 = process;
            Thread timeoutThread = new Thread(() -> {
                try {
                    Thread.sleep(timeLimitMs);
                    if (finalProcess2.isAlive()) {
                        isTimeout[0] = true;
                        finalProcess2.destroy();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            timeoutThread.start();

            Thread memoryMonitorThread = null;
            if (memoryLimitMB > 0 && pid != -1) {
                Process finalProcess3 = process;
                memoryMonitorThread = new Thread(() -> {
                    try {
                        while (finalProcess3.isAlive()) {
                            long usage = getMemoryUsage(pid);
                            maxMemory.set(Math.max(maxMemory.get(), usage));
                            if (usage > memoryLimitMB) {
                                isMemoryExceeded[0] = true;
                                finalProcess3.destroy();
                                break;
                            }
                            Thread.sleep(10);
                        }
                    } catch (Exception e) {
                        errorBuffer.append("内存监控错误: ").append(e.getMessage()).append("\n");
                    }
                });
                memoryMonitorThread.start();
            }

            boolean exited = process.waitFor(timeLimitMs + 1000, TimeUnit.MILLISECONDS);
            endTime = System.currentTimeMillis();

            if (!exited) process.destroyForcibly();

            outputThread.join();
            errorThread.join();
            timeoutThread.join();
            if (memoryMonitorThread != null) memoryMonitorThread.join();

            String output = outputBuffer.toString().trim();
            String error = errorBuffer.toString().trim();
            String errorMessage = null;

            if (isTimeout[0]) {
                errorMessage = "Time limit exceeded";
            } else if (isMemoryExceeded[0]) {
                errorMessage = "Memory limit exceeded";
            } else if (!error.isEmpty()) {
                errorMessage = error;
            } else if (process.exitValue() != 0) {
                errorMessage = "Non-zero exit code: " + process.exitValue();
            }

            return new RunResult(
                    errorMessage == null,
                    output,
                    errorMessage,
                    endTime - startTime,
                    maxMemory.get()
            );

        } catch (IOException | InterruptedException e) {
            return new RunResult(false, null, "执行错误: " + e.getMessage(),
                    endTime - startTime, maxMemory.get());
        } finally {
            if (process != null) process.destroyForcibly();
        }
    }

    public static JudgeResult judgeCode(String submittedCode, String zipFilePath, long timeLimitMs, long memoryLimitMB) {
        String codeFilePath = "Main.java";

        try {
            Files.write(new File(codeFilePath).toPath(), processCode(submittedCode).getBytes());

            CompileResult compileResult = compileCode(codeFilePath);
            if (!compileResult.isSuccess()) {
                return new JudgeResult("编译错误", compileResult.getError(), 0, 0);
            }

            long maxTime = 0;
            long maxMemory = 0;
            List<String> failedCases = new ArrayList<>();
            File tempZipFile = File.createTempFile("temp", ".zip");

            try (InputStream inputStream = minioClient.getObject(GetObjectArgs.builder()
                    .bucket(MINIO_BUCKET_NAME)
                    .object(zipFilePath)
                    .build())) {
                Files.copy(inputStream, tempZipFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            } catch (MinioException | InvalidKeyException | NoSuchAlgorithmException | IOException e) {
                return new JudgeResult("MinIO下载错误", e.getMessage(), 0, 0);
            }

            try (ZipFile zipFile = new ZipFile(tempZipFile)) {
                int caseNumber = 1;
                while (true) {
                    String inputEntryName = caseNumber + ".in";
                    String outputEntryName = caseNumber + ".out";

                    if (zipFile.getEntry(inputEntryName) == null ||
                            zipFile.getEntry(outputEntryName) == null) {
                        break;
                    }

                    String inputData = readFileFromZip(zipFile, inputEntryName);
                    String expectedOutput = readFileFromZip(zipFile, outputEntryName);

                    RunResult runResult = runCode("Main", inputData, timeLimitMs, memoryLimitMB);

                    maxTime = Math.max(maxTime, runResult.getTimeUsedMs());
                    maxMemory = Math.max(maxMemory, runResult.getMaxMemoryUsedMB());

                    if (!runResult.isSuccess()) {
                        String error = runResult.getError();
                        if (error.contains("Time limit exceeded")) {
                            failedCases.add("时间超出限制");
                        } else if (error.contains("Memory limit exceeded")) {
                            failedCases.add("内存超出限制");
                        } else {
                            failedCases.add("运行时错误");
                        }
                    } else if (!runResult.getOutput().equals(expectedOutput)) {
                        failedCases.add("答案错误");
                    }
                    caseNumber++;
                }
            }

            if (failedCases.isEmpty()) {
                return new JudgeResult("通过", "答案正确", maxTime, maxMemory);
            } else {
                return new JudgeResult("未通过", String.join("\n", failedCases), maxTime, maxMemory);
            }
        } catch (IOException e) {
            return new JudgeResult("系统错误", e.getMessage(), 0, 0);
        } finally {
            new File(codeFilePath).delete();
            new File("Main.class").delete();
        }
    }

    private static long getPid(Process process) {
        try {
            // 适用于 UNIX 系统
            if (process.getClass().getName().equals("java.lang.UNIXProcess")) {
                Field pidField = process.getClass().getDeclaredField("pid");
                pidField.setAccessible(true);
                return pidField.getLong(process);
            }
            // 适用于 Windows 系统
            else if (process.getClass().getName().equals("java.lang.Win32Process") ||
                    process.getClass().getName().equals("java.lang.ProcessImpl")) {
                Field handleField = process.getClass().getDeclaredField("handle");
                handleField.setAccessible(true);
                return (long) handleField.getLong(process);
            }
        } catch (Exception e) {
            // 处理异常
        }
        return -1;
    }

    // 修改后的内存监控方法（兼容 Java 8）
    private static long getMemoryUsage(long pid) throws IOException, InterruptedException {
        String os = System.getProperty("os.name").toLowerCase();
        try {
            if (os.contains("win")) {
                ProcessBuilder pb = new ProcessBuilder(
                        "powershell",
                        "-Command",
                        "(Get-Counter \"\\Process(*)\\Working Set - Private\" | " +
                                "Where-Object {$_.InstanceName -eq \"" + pid + "\"}).CounterSamples.CookedValue"
                );
                Process ps = pb.start();
                ps.waitFor();

                try (BufferedReader br = new BufferedReader(new InputStreamReader(ps.getInputStream()))) {
                    String line = br.readLine();
                    return line != null ? (long) (Double.parseDouble(line.trim()) / 1024 / 1024) : 0;
                }
            } else {
                // 使用 ps 命令获取内存（Linux/Mac）
                ProcessBuilder pb = new ProcessBuilder("ps", "-o", "rss=", "-p", String.valueOf(pid));
                Process ps = pb.start();
                ps.waitFor();

                try (BufferedReader br = new BufferedReader(new InputStreamReader(ps.getInputStream()))) {
                    String line = br.readLine();
                    return line != null ? Long.parseLong(line.trim()) / 1024 : 0;
                }
            }
        } catch (Exception e) {
            return 0;
        }
    }

    private static String readFileFromZip(ZipFile zipFile, String entryName) throws IOException {
        StringBuilder content = new StringBuilder();
        ZipEntry entry = zipFile.getEntry(entryName);
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(zipFile.getInputStream(entry)))) {
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }
        }
        return content.toString().trim();
    }

    private static String processCode(String code) {
        code = code.replaceAll("package\\s+\\w+\\s*;", "");
        if (!code.contains("public class Main")) {
            if (code.contains("class Main")) {
                code = code.replace("class Main", "public class Main");
            } else if (code.matches(".*\\bclass\\s+\\w+\\s*\\{.*")) {
                code = code.replaceAll("\\bclass\\s+(\\w+)", "public class Main");
            } else {
                code = "public class Main {\n" + code + "\n}";
            }
        }
        return code;
    }

    public static String Check(String code, String testCasePath, int timeLimitMs, int memoryLimitMB) {
        code = processCode(code);
        JudgeResult result = judgeCode(code, testCasePath, timeLimitMs, memoryLimitMB);
        return result.details+result.getMaxTimeUsedMs();
    }
}