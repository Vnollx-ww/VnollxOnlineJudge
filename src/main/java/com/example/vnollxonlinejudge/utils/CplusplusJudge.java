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

public class CplusplusJudge {
    private static final String MINIO_ENDPOINT = "http://localhost:9000";
    private static final String MINIO_ACCESS_KEY = "vnollxvnollx";
    private static final String MINIO_SECRET_KEY = "vnollxvnollxvnollx";
    private static final String MINIO_BUCKET_NAME = "problem";

    private static final MinioClient minioClient = MinioClient.builder()
            .endpoint(MINIO_ENDPOINT)
            .credentials(MINIO_ACCESS_KEY, MINIO_SECRET_KEY)
            .build();

    // 编译结果类
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

    // 运行结果类（新增时间和内存字段）
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

    // 判题结果类（新增最大时间和内存字段）
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

    // 编译 C++ 代码
    public static CompileResult compileCode(String codeFilePath, String executableFilePath) {
        try {
            ProcessBuilder pb = new ProcessBuilder("g++", codeFilePath, "-o", executableFilePath);
            Process process = pb.start();

            BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream()));
            StringBuilder errorOutput = new StringBuilder();
            String line;
            while ((line = errorReader.readLine()) != null) {
                errorOutput.append(line).append("\n");
            }

            int exitCode = process.waitFor();
            if (exitCode != 0) {
                return new CompileResult(false, errorOutput.toString());
            }
            return new CompileResult(true, null);
        } catch (IOException | InterruptedException e) {
            return new CompileResult(false, e.getMessage());
        }
    }

    // 运行可执行文件（新增时间和内存监控）
    public static RunResult runCode(String executableFilePath, String inputData, long timeLimitMs, long memoryLimitMB) {
        Process process = null;
        AtomicLong maxMemory = new AtomicLong(0);
        long startTime = 0;
        long endTime = 0;

        try {
            ProcessBuilder pb = new ProcessBuilder(executableFilePath);
            process = pb.start();
            startTime = System.currentTimeMillis(); // 进程启动后立即记录开始时间

            try (OutputStream stdin = process.getOutputStream()) {
                stdin.write(inputData.getBytes());
            }

            StringBuilder outputBuffer = new StringBuilder();
            StringBuilder errorBuffer = new StringBuilder();

            // 输出读取线程
            Process finalProcess1 = process;
            Thread outputThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(finalProcess1.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        outputBuffer.append(line).append("\n");
                    }
                } catch (IOException e) {
                    errorBuffer.append("输出读取错误: ").append(e.getMessage()).append("\n");
                }
            });
            outputThread.start();

            // 错误流读取线程
            Process finalProcess3 = process;
            Thread errorThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(finalProcess3.getErrorStream()))) {
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

            // 超时监控线程
            Process finalProcess = process;
            Thread timeoutThread = new Thread(() -> {
                try {
                    Thread.sleep(timeLimitMs);
                    if (finalProcess.isAlive()) {
                        isTimeout[0] = true;
                        finalProcess.destroy();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            timeoutThread.start();

            // 内存监控线程
            Thread memoryMonitorThread = null;
            if (memoryLimitMB > 0 && pid != -1) {
                Process finalProcess2 = process;
                memoryMonitorThread = new Thread(() -> {
                    try {
                        while (finalProcess2.isAlive()) {
                            long usage = getWindowsMemoryUsage(pid);
                            maxMemory.set(Math.max(maxMemory.get(), usage));
                            if (usage > memoryLimitMB) {
                                isMemoryExceeded[0] = true;
                                finalProcess2.destroy();
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

            // 等待进程结束（核心计时逻辑）
            boolean exited = process.waitFor(timeLimitMs + 1000, TimeUnit.MILLISECONDS);
            endTime = System.currentTimeMillis(); // 进程结束后立即记录结束时间

            // 清理和强制终止
            if (!exited) process.destroyForcibly();

            // 等待所有监控线程结束（不计入时间统计）
            outputThread.join();
            errorThread.join();
            timeoutThread.join();
            if (memoryMonitorThread != null) memoryMonitorThread.join();

            // 结果处理逻辑
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
                    endTime - startTime, // 这里只计算进程存活期间的时间差
                    maxMemory.get()
            );

        } catch (IOException | InterruptedException e) {
            return new RunResult(false, null, "执行错误: " + e.getMessage(),
                    endTime - startTime, maxMemory.get());
        } finally {
            if (process != null) process.destroyForcibly();
        }
    }

    // 判题核心逻辑
    public static JudgeResult judgeCode(String submittedCode, String zipFilePath, long timeLimitMs, long memoryLimitMB) {
        String codeFilePath = "submitted_code.cpp";
        String executableFilePath = "submitted_code.out";

        try {
            Files.write(new File(codeFilePath).toPath(), submittedCode.getBytes());

            CompileResult compileResult = compileCode(codeFilePath, executableFilePath);
            if (!compileResult.isSuccess()) {
                if (compileResult.getError().contains("too large") &&
                        compileResult.getError().contains("size of")) {
                    return new JudgeResult("内存错误", "内存超出限制", 0, 0);
                }
                return new JudgeResult("编译错误", "编译错误", 0, 0);
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

                    RunResult runResult = runCode(executableFilePath, inputData, timeLimitMs, memoryLimitMB);

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
                        /*failedCases.add("测试用例 " + caseNumber + ": 答案错误\n预期输出: " +
                                expectedOutput + "\n实际输出: " + runResult.getOutput());*/
                        failedCases.add("答案错误");
                    }
                    caseNumber++;
                }
            }

            if (failedCases.isEmpty()) {
                return new JudgeResult("通过", "答案正确", maxTime, maxMemory);
            } else {
                return new JudgeResult("未通过", String.join("\n\n", failedCases), maxTime, maxMemory);
            }
        } catch (IOException e) {
            return new JudgeResult("系统错误", e.getMessage(), 0, 0);
        } finally {
            new File(codeFilePath).delete();
            new File(executableFilePath).delete();
        }
    }

    // 工具方法
    private static long getPid(Process process) {
        try {
            Field pidField = process.getClass().getDeclaredField("pid");
            pidField.setAccessible(true);
            return pidField.getLong(process);
        } catch (Exception e) {
            return -1;
        }
    }

    private static long getWindowsMemoryUsage(long pid) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(
                "powershell",
                "-Command",
                "(Get-Counter \"\\Process(*)\\Working Set - Private\" | " +
                        "Where-Object {$_.InstanceName -eq \"" + pid + "\"}).CounterSamples.CookedValue"
        );

        Process ps = pb.start();
        ps.waitFor();

        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(ps.getInputStream()))) {
            String line = br.readLine();
            if (line == null) return 0;

            // 直接返回MB值
            return (long)(Double.parseDouble(line.trim()) / 1024 / 1024);
        } catch (Exception e) {
            System.err.println("内存查询错误: " + e.getMessage());
            return 0;
        }
    }

    private static String readFileFromZip(ZipFile zipFile, String entryName) throws IOException {
        StringBuilder content = new StringBuilder();
        ZipEntry entry = zipFile.getEntry(entryName);
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(zipFile.getInputStream(entry)))) {
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }
        }
        return content.toString().trim();
    }

    // 预处理代码
    public static String processCode(String code) {
        String[] triggers = {"using namespace std;", "int main()", "void main()", "signed main()"};
        for (String trigger : triggers) {
            int index = code.indexOf(trigger);
            while (index != -1) {
                if (index == 0 || code.charAt(index - 1) != '\n') {
                    code = code.substring(0, index) + "\n" + code.substring(index);
                }
                index = code.indexOf(trigger, index + trigger.length() + 1);
            }
        }

        int index = code.indexOf('#');
        while (index != -1) {
            if (index > 0 && code.charAt(index - 1) != '\n') {
                code = code.substring(0, index) + "\n" + code.substring(index);
                index += 2;
            } else {
                index++;
            }
            index = code.indexOf('#', index);
        }
        return code;
    }

    // 对外接口
    public static String Check(String code, String testCasePath, int timeLimitMs, int memoryLimitMB) {
        code = processCode(code);
        JudgeResult result = judgeCode(code, testCasePath, timeLimitMs, memoryLimitMB);
        return result.details+result.getMaxTimeUsedMs();
    }
}