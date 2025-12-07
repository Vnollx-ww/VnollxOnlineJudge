package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.service.TestCaseCacheService;
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
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

@Component
public class PythonJudgeStrategy implements JudgeStrategy {
    private final TestCaseCacheService testCaseCacheService;
    private final RestTemplate restTemplate;
    private final String RUN_URL;
    private static final Logger logger = LoggerFactory.getLogger(PythonJudgeStrategy.class);
    private static final int BATCH_SIZE = 20; // 每批最多处理的测试用例数

    @Autowired
    public PythonJudgeStrategy(
            TestCaseCacheService testCaseCacheService,
            String goJudgeEndpoint,
            RestTemplate restTemplate) {
        this.restTemplate=restTemplate;
        this.testCaseCacheService = testCaseCacheService;
        this.RUN_URL = goJudgeEndpoint + "/run";
    }


    @Override
    public RunResult judge(String code, String dataZipUrl, Long timeLimit, Long memoryLimit) {
        RunResult result = judgeCode(code, dataZipUrl, timeLimit, memoryLimit,null,null);
        result.setRunTime(result.getTime() / 1000000);
        result.setMemory(result.getMemory()/ 1048576);
        // 状态码转换
        switch (result.getStatus()) {
            case "Accepted" -> result.setStatus("答案正确");
            case "Time Limit Exceeded" -> result.setStatus("时间超出限制");
            case "Memory Limit Exceeded" -> result.setStatus("内存超出限制");
            case "Runtime Error" -> result.setStatus("运行时错误");
        }

        return result;
    }

    @Override
    public RunResult testJudge(String code, String inputExample, String outputExample, Long timeLimit, Long memoryLimit) {
        RunResult result = judgeCode(code, null, timeLimit, memoryLimit,inputExample,outputExample);
        result.setRunTime(result.getTime() / 1000000);
        result.setMemory(result.getMemory()/1048576);
        switch (result.getStatus()) {
            case "Accepted" -> result.setStatus("答案正确");
            case "Time Limit Exceeded" -> result.setStatus("时间超出限制");
            case "Memory Limit Exceeded" -> result.setStatus("内存超出限制");
            case "Runtime Error" -> result.setStatus("运行时错误");
        }

        return result;
    }

    private RunResult judgeCode(
            String submittedCode, String zipFilePath,
            Long timeLimitMs, Long memoryLimitMB,
            String inputExample,String outExample
    ) {
        try {
            List<String[]> testCases =new ArrayList<>();

            if (inputExample!=null&&outExample!=null){
                testCases.add(new String[]{inputExample,outExample});
            }else{
                //从缓存或MinIO获取测试用例
                testCases =testCaseCacheService.getTestCases(zipFilePath);
            }

            // 批量执行测试用例
            RunResult finalResult = new RunResult();
            finalResult.setStatus("Accepted");
            finalResult.setFiles(new RunResult.Files());
            finalResult.getFiles().setStdout("");
            finalResult.getFiles().setStderr("");
            finalResult.setRunTime(0L);
            finalResult.setTime(0L);
            finalResult.setMemory(0L);
            finalResult.setTestCount(testCases.size());
            finalResult.setPassCount(0);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // 分批处理测试用例
            for (int batchStart = 0; batchStart < testCases.size(); batchStart += BATCH_SIZE) {
                int batchEnd = Math.min(batchStart + BATCH_SIZE, testCases.size());
                List<String[]> batch = testCases.subList(batchStart, batchEnd);

                // 构建批量请求
                String jsonPayload = buildBatchRunPayload(submittedCode, batch, timeLimitMs * 1000000L, memoryLimitMB * 1024 * 1024);
                HttpEntity<String> entity = new HttpEntity<>(jsonPayload, headers);

                // 一次请求执行整批测试用例
                ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                        RUN_URL,
                        HttpMethod.POST,
                        entity,
                        new ParameterizedTypeReference<List<RunResult>>() {}
                );

                if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                    finalResult.setStatus("判题错误");
                    logger.error("批量判题请求失败");
                    finalResult.getFiles().setStderr("Failed to execute batch test cases");
                    return finalResult;
                }

                List<RunResult> results = response.getBody();

                // 处理批量返回的结果
                for (int i = 0; i < results.size(); i++) {
                    RunResult result = results.get(i);
                    String[] testCase = batch.get(i);

                    // 更新最大时间和内存
                    finalResult.setTime(Math.max(finalResult.getTime(), result.getTime()));
                    finalResult.setMemory(Math.max(finalResult.getMemory(), result.getMemory()));
                    finalResult.setRunTime(Math.max(finalResult.getRunTime(), result.getRunTime()));

                    // 检查运行状态
                    if (!"Accepted".equals(result.getStatus())) {
                        finalResult.setStatus(result.getStatus());
                        finalResult.setExitStatus(result.getExitStatus());
                        if (result.getFiles() != null) {
                            finalResult.getFiles().setStderr(result.getFiles().getStderr());
                        }
                        return finalResult;
                    }

                    // 检验输出结果
                    try {
                        String expectedOutput = testCase[1].trim();
                        String actualOutput = result.getFiles().getStdout().trim();

                        if (!expectedOutput.equals(actualOutput)) {
                            String errorMessage = String.format(
                                    "测试用例执行失败%n输入: %s%n期待输出: %s%n实际输出: %s",
                                    truncateString(testCase[0], 100),
                                    truncateString(expectedOutput, 200),
                                    truncateString(actualOutput, 200)
                            );
                            finalResult.setStatus("答案错误");
                            finalResult.getFiles().setStderr(errorMessage);
                            return finalResult;
                        }
                    } catch (Exception e) {
                        finalResult.setStatus("答案错误");
                        finalResult.getFiles().setStderr("输出比较异常: " + e.getMessage());
                        return finalResult;
                    }
                }
            }

            finalResult.setPassCount(testCases.size());
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

    private String truncateString(String str, int maxLength) {
        if (str == null) return "null";
        if (str.length() <= maxLength) return str;
        return str.substring(0, maxLength) + "...(截断，总长度:" + str.length() + ")";
    }

    /**
     * 构建批量运行请求的 JSON payload
     * go-judge 支持在一个请求中包含多个 cmd，会并行执行
     */
    private String buildBatchRunPayload(String code, List<String[]> testCases, Long cpuLimit, Long memoryLimit) {
        String escapedCode = escapeString(code);
        StringBuilder cmds = new StringBuilder();
        for (int i = 0; i < testCases.size(); i++) {
            if (i > 0) {
                cmds.append(",");
            }
            String input = testCases.get(i)[0];
            cmds.append(buildSingleCmd(escapedCode, input, cpuLimit, memoryLimit));
        }
        return "{\"cmd\": [" + cmds + "]}";
    }

    /**
     * 构建单个测试用例的 cmd 对象
     */
    private String buildSingleCmd(String escapedCode, String input, Long cpuLimit, Long memoryLimit) {
        String escapedInput = escapeString(input);

        return String.format("""
            {
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
            }""", escapedInput, cpuLimit, memoryLimit, escapedCode);
    }

    /**
     * 转义特殊字符
     */
    private String escapeString(String str) {
        return str.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
    }
}