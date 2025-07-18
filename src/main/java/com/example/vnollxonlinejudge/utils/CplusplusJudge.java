package com.example.vnollxonlinejudge.utils;

import com.example.vnollxonlinejudge.common.result.RunResult;
import com.example.vnollxonlinejudge.service.ProblemService;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

public class CplusplusJudge {
    private static final Logger logger = LoggerFactory.getLogger(CplusplusJudge.class);
    private static final String MINIO_ENDPOINT = "http://localhost:9000";
    private static final String MINIO_ACCESS_KEY = "vnollxvnollx";
    private static final String MINIO_SECRET_KEY = "vnollxvnollxvnollx";
    private static final String MINIO_BUCKET_NAME = "problem";

    private static final String COMPILE_URL = "http://127.0.0.1:5050/run";
    private static final String RUN_URL = "http://127.0.0.1:5050/run";
    private static final String DELETE_URL = "http://127.0.0.1:5050/file/{fileId}";

    private static final MinioClient minioClient = MinioClient.builder()
            .endpoint(MINIO_ENDPOINT)
            .credentials(MINIO_ACCESS_KEY, MINIO_SECRET_KEY)
            .build();

    // 判题核心逻辑
    public static RunResult judgeCode(String submittedCode, String zipFilePath, long timeLimitMs, long memoryLimitMB) {
        // 1. 编译代码
        String binaryFileId = compileCode(submittedCode);
        if (binaryFileId == null) {
            RunResult result = new RunResult();
            result.setStatus("编译错误");
            result.setExitStatus(1);
            result.setFiles(new RunResult.Files());
            result.getFiles().setStderr("编译错误");
            return result;
        }
        else if (binaryFileId.equals("超出内存限制")){
            RunResult result = new RunResult();
            result.setStatus("超出内存限制");
            result.setExitStatus(1);
            result.setFiles(new RunResult.Files());
            result.getFiles().setStderr("超出内存限制");
            return result;
        }
        try {
            // 2. 从MinIO下载测试用例zip文件
            InputStream zipStream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(MINIO_BUCKET_NAME)
                            .object(zipFilePath)
                            .build());

            // 保存到临时文件
            java.nio.file.Path tempZipPath = java.nio.file.Files.createTempFile("testcases", ".zip");
            java.nio.file.Files.copy(zipStream, tempZipPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            // 3. 读取测试用例
            List<String[]> testCases = readTestCasesFromZip(tempZipPath.toString());

            // 4. 执行测试用例
            RunResult finalResult = new RunResult();
            finalResult.setStatus("Accepted"); // 默认设为Accepted，如果有错误会覆盖
            finalResult.setFiles(new RunResult.Files());
            finalResult.getFiles().setStdout("");
            finalResult.getFiles().setStderr("");

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            for (String[] testCase : testCases) {
                String input = testCase[0] + " " + testCase[1];
                String jsonPayload = buildRunPayload(input, binaryFileId, timeLimitMs * 1000000L, memoryLimitMB * 1024 * 1024);
                HttpEntity<String> entity = new HttpEntity<>(jsonPayload, headers);

                // 发送运行请求
                ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                        RUN_URL,
                        HttpMethod.POST,
                        entity,
                        new ParameterizedTypeReference<List<RunResult>>() {}
                );

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    RunResult result = response.getBody().get(0);

                    // 累加时间和内存
                    finalResult.setTime(Math.max(finalResult.getTime(),result.getTime()));
                    finalResult.setMemory(Math.max(finalResult.getMemory(), result.getMemory()));
                    finalResult.setRunTime(Math.max(finalResult.getRunTime(),result.getRunTime()));

                    if (!"Accepted".equals(result.getStatus())) {
                        finalResult.setStatus(result.getStatus());
                        return finalResult;
                    }

                    // 验证结果
                    try {
                        String expectedOutput = testCase[1]; // 直接从测试用例中获取预期输出
                        String actualOutput = result.getFiles().getStdout().trim(); // 获取程序实际输出

                        if (!expectedOutput.equals(actualOutput)) {
                            finalResult.setStatus("答案错误");
                            finalResult.getFiles().setStderr(finalResult.getFiles().getStderr() +
                                    "测试用例错误. 期待: " + expectedOutput +
                                    ", 实际: " + actualOutput + "\n");
                            return finalResult;
                        }
                    } catch (Exception e) {
                        finalResult.setStatus("答案错误");

                        finalResult.getFiles().setStderr(finalResult.getFiles().getStderr() +
                                "比较输出出错: " + e.getMessage() + "\n");
                        return finalResult;
                    }
                } else {
                    finalResult.setStatus("判题错误");
                    logger.error("判题过程中出错: ");  // 记录完整堆栈
                    finalResult.getFiles().setStderr("Failed to execute test case");
                }
            }

            // 5. 删除编译的二进制文件
            deleteBinaryFile(restTemplate, binaryFileId);

            return finalResult;

        } catch (Exception e) {
            RunResult result = new RunResult();
            result.setStatus("判题错误");
            logger.error("判题过程中出错: ", e);  // 记录完整堆栈
            result.setExitStatus(1);
            result.setFiles(new RunResult.Files());
            result.getFiles().setStderr("判题过程中出错: " + e.getMessage());
            return result;
        }
    }

    // 从zip文件中读取测试用例
    private static List<String[]> readTestCasesFromZip(String zipPath) throws IOException {
        List<String[]> testCases = new ArrayList<>();
        try (ZipFile zipFile = new ZipFile(zipPath)) {
            int i = 1;
            while (true) {
                String inputFile = i + ".in";
                String outputFile = i + ".out";

                ZipEntry inputEntry = zipFile.getEntry(inputFile);
                ZipEntry outputEntry = zipFile.getEntry(outputFile);

                if (inputEntry == null || outputEntry == null) {
                    break;
                }

                String input = readFileFromZip(zipFile, inputFile);
                String output = readFileFromZip(zipFile, outputFile);

                testCases.add(new String[]{input, output});
                i++;
            }
        }
        return testCases;
    }

    // 工具方法
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

    // 编译代码并返回二进制文件ID
    private static String compileCode(String code) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String compilePayload = buildCompilePayload(code);
        HttpEntity<String> entity = new HttpEntity<>(compilePayload, headers);

        try {
            // 发送编译请求
            ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                    COMPILE_URL,
                    HttpMethod.POST,
                    entity,
                    new ParameterizedTypeReference<List<RunResult>>() {}
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                RunResult result = response.getBody().get(0);
                if ("Accepted".equals(result.getStatus()) && result.getFileIds() != null) {
                    String fileId = result.getFileIds().getA();
                    return fileId;
                }else if ("Memory Limit Exceeded".equals(result.getStatus())){
                    return "内存超出限制";
                } else {
                    System.out.println("编译失败: " + result.getFiles().getStderr());
                }
            } else {
                System.out.println("编译请求响应异常: " + response.getStatusCode());
            }
        } catch (Exception e) {
            System.out.println("编译请求发生异常: " + e.getMessage());
        }

        return null;
    }

    // 构建编译请求的JSON payload
    private static String buildCompilePayload(String code) {
        // 转义代码中的特殊字符
        String escapedCode = code.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");

        return String.format("""
    {
        "cmd": [{
            "args": ["/usr/bin/g++", "a.cc", "-o", "a"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{
                "content": ""
            }, {
                "name": "stdout",
                "max": 10240
            }, {
                "name": "stderr",
                "max": 10240
            }],
            "cpuLimit": 10000000000,
            "memoryLimit": 104857600,
            "procLimit": 50,
            "copyIn": {
                "a.cc": {
                    "content": "%s"
                }
            },
            "copyOut": ["stdout", "stderr"],
            "copyOutCached": ["a"]
        }]
    }
    """, escapedCode);
    }

    // 构建运行请求的JSON payload
    private static String buildRunPayload(String input, String fileId, long cpuLimit, long memoryLimit) {
        input = input.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");

        return String.format("""
        {
            "cmd": [{
                "args": ["a"],
                "env": ["PATH=/usr/bin:/bin"],
                "files": [{
                    "content": "%s"
                }, {
                    "name": "stdout",
                    "max": 10240
                }, {
                    "name": "stderr",
                    "max": 10240
                }],
                "cpuLimit": %d,
                "memoryLimit": %d,
                "procLimit": 50,
                "copyIn": {
                    "a": {
                        "fileId": "%s"
                    }
                }
            }]
        }
        """, input, cpuLimit, memoryLimit, fileId);
    }

    // 删除编译的二进制文件
    private static void deleteBinaryFile(RestTemplate restTemplate, String fileId) {
        if (fileId == null || fileId.isEmpty()) {
            return;
        }

        try {
            Map<String, String> params = new HashMap<>();
            params.put("fileId", fileId);

            ResponseEntity<Void> response = restTemplate.exchange(
                    DELETE_URL,
                    HttpMethod.DELETE,
                    null,
                    Void.class,
                    params
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                System.out.println("删除二进制文件失败，状态码: " + response.getStatusCode());
            }
        } catch (Exception e) {
            System.out.println("删除二进制文件时发生异常: " + e.getMessage());
        }
    }
    public static RunResult Judge(String code, String testCasePath, int timeLimitMs, int memoryLimitMB) {
        RunResult result=judgeCode(code, testCasePath, timeLimitMs, memoryLimitMB);
        result.setRunTime(result.getTime()/1000000);
        if (result.getStatus().equals("Accepted"))result.setStatus("答案正确");
        else if (result.getStatus().equals("Time Limit Exceeded"))result.setStatus("时间超出限制");
        else if (result.getStatus().equals("Memory Limit Exceeded"))result.setStatus("内存超出限制");
        return result;
    }
}