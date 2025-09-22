package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

@Component
public class CppJudgeStrategy implements JudgeStrategy {
    private final String COMPILE_URL ;
    private final String RUN_URL  ;
    private final String DELETE_URL ;
    private final MinioClient minioClient;
    private static final Logger logger = LoggerFactory.getLogger(CppJudgeStrategy.class);
    private static final String MINIO_BUCKET_NAME = "problem";
    @Autowired
    public CppJudgeStrategy(String goJudgeEndpoint,MinioClient minioClient) {
        this.COMPILE_URL = goJudgeEndpoint + "/run";
        this.RUN_URL = goJudgeEndpoint + "/run";
        this.DELETE_URL = goJudgeEndpoint + "/file/{fileId}";
        this.minioClient = minioClient;
    }




    @Override
    public RunResult judge(String code, String dataZipUrl, Long timeLimit, Long memoryLimit) {
        RunResult result = judgeCode(code, dataZipUrl, timeLimit, memoryLimit);
        result.setRunTime(result.getTime() / 1000000);
        result.setMemory(result.getMemory()/1048576);
        switch (result.getStatus()) {
            case "Accepted" -> result.setStatus("答案正确");
            case "Time Limit Exceeded" -> result.setStatus("时间超出限制");
            case "Signalled" -> result.setStatus("内存超出限制");
        }

        return result;
    }

    private RunResult judgeCode(String submittedCode, String zipFilePath, Long timeLimitMs, Long memoryLimitMB) {
        // 1. Compile code
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
            // 2. Download test cases zip from MinIO
            InputStream zipStream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(MINIO_BUCKET_NAME)
                            .object(zipFilePath)
                            .build());

            // Save to temp file
            Path tempZipPath = Files.createTempFile("testcases", ".zip");
            Files.copy(zipStream, tempZipPath, StandardCopyOption.REPLACE_EXISTING);

            // 3. Read test cases
            List<String[]> testCases = readTestCasesFromZip(tempZipPath.toString());

            // 4. Execute test cases
            RunResult finalResult = new RunResult();
            finalResult.setStatus("Accepted"); // Default to Accepted, will be overridden if errors occur
            finalResult.setFiles(new RunResult.Files());
            finalResult.getFiles().setStdout("");
            finalResult.getFiles().setStderr("");
            finalResult.setRunTime(0L);
            finalResult.setTime(0L);
            finalResult.setMemory(0L);
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            for (String[] testCase : testCases) {
                String input = testCase[0] + " " + testCase[1];
                String jsonPayload = buildRunPayload(input, binaryFileId, timeLimitMs * 1000000L, memoryLimitMB * 1024 * 1024);
                HttpEntity<String> entity = new HttpEntity<>(jsonPayload, headers);

                // Send run request
                ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                        RUN_URL,
                        HttpMethod.POST,
                        entity,
                        new ParameterizedTypeReference<List<RunResult>>() {}
                );
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    RunResult result = response.getBody().get(0);
                    // Accumulate time and memory
                    finalResult.setTime(Math.max(finalResult.getTime(), result.getTime()));
                    finalResult.setMemory(Math.max(finalResult.getMemory(), result.getMemory()));
                    finalResult.setRunTime(Math.max(finalResult.getRunTime(), result.getRunTime()));

                    if (!"Accepted".equals(result.getStatus())) {
                        if (finalResult.getStatus().equals("Signalled")){
                            finalResult.setMemory(memoryLimitMB * 1024 * 1024);
                        }
                        finalResult.setStatus(result.getStatus());
                        return finalResult;
                    }

                    // Verify result
                    try {
                        String expectedOutput = testCase[1]; // Expected output from test case
                        String actualOutput = result.getFiles().getStdout().trim(); // Actual program output

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
                    logger.error("判题过程中出错: ");
                    finalResult.getFiles().setStderr("Failed to execute test case");
                }
            }

            // 5. Delete compiled binary
            deleteBinaryFile(restTemplate, binaryFileId);

            return finalResult;

        } catch (Exception e) {
            RunResult result = new RunResult();
            result.setStatus("判题错误");
            logger.error("判题过程中出错: ", e);
            result.setExitStatus(1);
            result.setFiles(new RunResult.Files());
            result.getFiles().setStderr("判题过程中出错: " + e.getMessage());
            return result;
        }
    }

    private List<String[]> readTestCasesFromZip(String zipPath) throws IOException {
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

    private String readFileFromZip(ZipFile zipFile, String entryName) throws IOException {
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

    private String compileCode(String code) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String compilePayload = buildCompilePayload(code);
        HttpEntity<String> entity = new HttpEntity<>(compilePayload, headers);

        try {
            ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                    COMPILE_URL,
                    HttpMethod.POST,
                    entity,
                    new ParameterizedTypeReference<List<RunResult>>() {}
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                RunResult result = response.getBody().get(0);
                if ("Accepted".equals(result.getStatus()) && result.getFileIds() != null) {
                    return result.getFileIds().getA();
                } else if ("Memory Limit Exceeded".equals(result.getStatus())) {
                    return "内存超出限制";
                } else {
                    logger.error("编译失败: " + result.getFiles().getStderr());
                }
            } else {
                logger.error("编译请求响应异常: " + response.getStatusCode());
            }
        } catch (Exception e) {
            logger.error("编译请求发生异常: " + e.getMessage());
        }

        return null;
    }

    private String buildCompilePayload(String code) {
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

    private String buildRunPayload(String input, String fileId, Long cpuLimit, Long memoryLimit) {
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

    private void deleteBinaryFile(RestTemplate restTemplate, String fileId) {
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
                logger.error("删除二进制文件失败，状态码: " + response.getStatusCode());
            }
        } catch (Exception e) {
            logger.error("删除二进制文件时发生异常: " + e.getMessage());
        }
    }
}