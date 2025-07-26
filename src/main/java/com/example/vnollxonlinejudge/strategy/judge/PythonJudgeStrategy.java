package com.example.vnollxonlinejudge.strategy.judge;

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
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

@Component
public class PythonJudgeStrategy implements JudgeStrategy {
    private final String RUN_URL;
    private final String DELETE_URL;

    @Autowired
    public PythonJudgeStrategy(String goJudgeEndpoint) {
        this.RUN_URL = goJudgeEndpoint + "/run";
        this.DELETE_URL = goJudgeEndpoint + "/file/{fileId}";
    }

    private static final Logger logger = LoggerFactory.getLogger(PythonJudgeStrategy.class);
    private static final String MINIO_BUCKET_NAME = "problem";

    @Autowired
    private MinioClient minioClient;

    @Override
    public RunResult judge(String code, String dataZipUrl, int timeLimit, int memoryLimit) {
        RunResult result = judgeCode(code, dataZipUrl, timeLimit, memoryLimit);
        result.setRunTime(result.getTime() / 1000000);

        // 状态码转换
        switch (result.getStatus()) {
            case "Accepted" -> result.setStatus("答案正确");
            case "Time Limit Exceeded" -> result.setStatus("时间超出限制");
            case "Memory Limit Exceeded" -> result.setStatus("内存超出限制");
            case "Runtime Error" -> result.setStatus("运行时错误");
        }

        return result;
    }

    private RunResult judgeCode(String submittedCode, String zipFilePath, long timeLimitMs, long memoryLimitMB) {
        try {
            // 1. 从MinIO下载测试用例ZIP
            InputStream zipStream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(MINIO_BUCKET_NAME)
                            .object(zipFilePath)
                            .build());

            // 保存为临时文件
            Path tempZipPath = Files.createTempFile("testcases", ".zip");
            Files.copy(zipStream, tempZipPath, StandardCopyOption.REPLACE_EXISTING);

            // 2. 读取测试用例
            List<String[]> testCases = readTestCasesFromZip(tempZipPath.toString());

            // 3. 执行测试用例
            RunResult finalResult = new RunResult();
            finalResult.setStatus("Accepted"); // 默认状态
            finalResult.setFiles(new RunResult.Files());
            finalResult.getFiles().setStdout("");
            finalResult.getFiles().setStderr("");

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            for (String[] testCase : testCases) {
                String input = testCase[0];
                String jsonPayload = buildRunPayload(submittedCode, input,
                        timeLimitMs * 1000000L,
                        memoryLimitMB * 1024 * 1024);
                HttpEntity<String> entity = new HttpEntity<>(jsonPayload, headers);

                // 发送执行请求
                ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                        RUN_URL,
                        HttpMethod.POST,
                        entity,
                        new ParameterizedTypeReference<List<RunResult>>() {}
                );

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    RunResult result = response.getBody().get(0);

                    // 记录最大时间和内存使用
                    finalResult.setTime(Math.max(finalResult.getTime(), result.getTime()));
                    finalResult.setMemory(Math.max(finalResult.getMemory(), result.getMemory()));

                    if (!"Accepted".equals(result.getStatus())) {
                        finalResult.setStatus(result.getStatus());
                        finalResult.setExitStatus(result.getExitStatus());
                        finalResult.getFiles().setStderr(result.getFiles().getStderr());
                        return finalResult;
                    }
                    String stderr=result.getFiles().getStderr();
                    if (stderr.contains("ValueError") && stderr.contains("int()")&&result.getStatus().equals("Nonzero Exit Status")) {
                        finalResult.setStatus("输入格式错误（请用input().split()处理多数字输入）");
                        return finalResult;
                    }
                    // 验证输出结果
                    try {
                        String expectedOutput = testCase[1].trim();
                        String actualOutput = result.getFiles().getStdout().trim();

                        if (!expectedOutput.equals(actualOutput)) {
                            finalResult.setStatus("答案错误");
                            finalResult.getFiles().setStderr(
                                    "测试用例不匹配。预期: [" + expectedOutput + "]，实际: [" + actualOutput + "]");
                            return finalResult;
                        }
                    } catch (Exception e) {
                        finalResult.setStatus("答案错误");
                        finalResult.getFiles().setStderr("输出比较异常: " + e.getMessage());
                        return finalResult;
                    }
                } else {
                    finalResult.setStatus("判题错误");
                    logger.error("判题服务响应异常: {}", response.getStatusCode());
                }
            }

            return finalResult;

        } catch (Exception e) {
            RunResult result = new RunResult();
            result.setStatus("判题错误");
            logger.error("判题过程中出错: ", e);
            result.setExitStatus(1);
            result.setFiles(new RunResult.Files());
            result.getFiles().setStderr("判题系统错误: " + e.getMessage());
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

                if (inputEntry == null || outputEntry == null) break;

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
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(zipFile.getInputStream(zipFile.getEntry(entryName))))) {
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }
        }
        return content.toString().trim();
    }

    private String buildRunPayload(String code, String input, long cpuLimit, long memoryLimit) {
        // 转义特殊字符
        String escapedCode = code.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");

        String escapedInput = input.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");

        return String.format("""
        {
            "cmd": [{
                "args": ["/usr/bin/python3", "main.py"],
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
                    "main.py": {
                        "content": "%s"
                    }
                },
                "copyOut": ["stdout", "stderr"]
            }]
        }
        """, escapedInput, cpuLimit, memoryLimit, escapedCode);
    }

}