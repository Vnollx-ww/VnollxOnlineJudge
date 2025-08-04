package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.common.result.RunResult;
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
public class JavaJudgeStrategy implements JudgeStrategy {
    private final String COMPILE_URL;
    private final String RUN_URL;
    private final String DELETE_URL;

    @Autowired
    public JavaJudgeStrategy(String goJudgeEndpoint) {
        this.COMPILE_URL = goJudgeEndpoint + "/run";
        this.RUN_URL = goJudgeEndpoint + "/run";
        this.DELETE_URL = goJudgeEndpoint + "/file/{fileId}";
    }

    private static final Logger logger = LoggerFactory.getLogger(JavaJudgeStrategy.class);
    private static final String MINIO_BUCKET_NAME = "problem";
    private static final String MAIN_CLASS_NAME = "Main"; // Java主类名

    @Autowired
    private MinioClient minioClient;

    @Override
    public RunResult judge(String code, String dataZipUrl, int timeLimit, int memoryLimit) {
        RunResult result = judgeCode(code, dataZipUrl, timeLimit, memoryLimit);
        result.setRunTime(result.getTime() / 1000000);

        switch (result.getStatus()) {
            case "Accepted" -> result.setStatus("答案正确");
            case "Time Limit Exceeded" -> result.setStatus("时间超出限制");
            case "Memory Limit Exceeded" -> result.setStatus("内存超出限制");
            case "Runtime Error" -> result.setStatus("运行时错误");
        }

        return result;
    }

    private RunResult judgeCode(String submittedCode, String zipFilePath, long timeLimitMs, long memoryLimitMB) {
        // 1. 编译Java代码
        String classFileId = compileJavaCode(submittedCode);
        if (classFileId == null) {
            RunResult result = new RunResult();
            result.setStatus("编译错误");
            result.setExitStatus(1);
            result.setFiles(new RunResult.Files());
            result.getFiles().setStderr("编译错误");
            return result;
        } else if (classFileId.equals("超出内存限制")) {
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
            Path tempZipPath = Files.createTempFile("testcases", ".zip");
            Files.copy(zipStream, tempZipPath, StandardCopyOption.REPLACE_EXISTING);

            // 3. 读取测试用例
            List<String[]> testCases = readTestCasesFromZip(tempZipPath.toString());

            // 4. 执行测试用例
            RunResult finalResult = new RunResult();
            finalResult.setStatus("Accepted"); // 默认Accepted，如有错误会被覆盖
            finalResult.setFiles(new RunResult.Files());
            finalResult.getFiles().setStdout("");
            finalResult.getFiles().setStderr("");

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            for (String[] testCase : testCases) {
                String input = testCase[0];
                String jsonPayload = buildRunPayload(input, classFileId, timeLimitMs * 1000000L, memoryLimitMB * 1024 * 1024);
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

                    // 累计时间和内存使用
                    finalResult.setTime(Math.max(finalResult.getTime(), result.getTime()));
                    finalResult.setMemory(Math.max(finalResult.getMemory(), result.getMemory()));
                    finalResult.setRunTime(Math.max(finalResult.getRunTime(), result.getRunTime()));

                    if (!"Accepted".equals(result.getStatus())) {
                        finalResult.setStatus(result.getStatus());
                        return finalResult;
                    }

                    // 验证结果
                    try {
                        String expectedOutput = testCase[1]; // 测试用例中的期望输出
                        String actualOutput = result.getFiles().getStdout().trim(); // 程序实际输出

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

            // 5. 删除编译后的class文件
            deleteClassFile(restTemplate, classFileId);

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

    private String compileJavaCode(String code) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String compilePayload = buildJavaCompilePayload(code);
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
                    return "超出内存限制";
                } else {
                    if (result.getFiles()!=null)System.out.println(result.getFiles().getStderr());
                    logger.error("Java编译失败: " + result.getFiles().getStderr());
                }
            } else {
                logger.error("Java编译请求响应异常: " + response.getStatusCode());
            }
        } catch (Exception e) {
            logger.error("Java编译请求发生异常: " + e.getMessage());
        }

        return null;
    }

    private String buildJavaCompilePayload(String code) {
        String escapedCode = code.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");

        return String.format("""
    {
        "cmd": [{
            "args": ["/usr/bin/javac", "-encoding", "UTF-8", "%s.java"],
            "env": ["PATH=/usr/bin:/bin", "JAVA_HOME=/usr/lib/jvm/default-java"],
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
                "%s.java": {
                    "content": "%s"
                }
            },
            "copyOut": ["stdout", "stderr"],
            "copyOutCached": ["%s.class"]
        }]
    }
    """, MAIN_CLASS_NAME, MAIN_CLASS_NAME, escapedCode, MAIN_CLASS_NAME);
    }

    private String buildRunPayload(String input, String fileId, long cpuLimit, long memoryLimit) {
        input = input.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");

        return String.format("""
        {
            "cmd": [{
                "args": ["/usr/bin/java", "-cp", ".", "%s"],
                "env": ["PATH=/usr/bin:/bin", "JAVA_HOME=/usr/lib/jvm/default-java"],
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
                    "%s.class": {
                        "fileId": "%s"
                    }
                }
            }]
        }
        """, MAIN_CLASS_NAME, input, cpuLimit, memoryLimit, MAIN_CLASS_NAME, fileId);
    }

    private void deleteClassFile(RestTemplate restTemplate, String fileId) {
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
                logger.error("删除Java class文件失败，状态码: " + response.getStatusCode());
            }
        } catch (Exception e) {
            logger.error("删除Java class文件时发生异常: " + e.getMessage());
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
}