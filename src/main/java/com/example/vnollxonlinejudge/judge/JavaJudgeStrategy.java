package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.service.TestCaseCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class JavaJudgeStrategy implements JudgeStrategy {
    private final TestCaseCacheService testCaseCacheService;
    private final RestTemplate restTemplate;
    private final String COMPILE_URL;
    private final String RUN_URL;
    private final String DELETE_URL;
    private static final Logger logger = LoggerFactory.getLogger(JavaJudgeStrategy.class);

    private static final String COMPILE_ERROR = "编译错误";
    private static final String TIME_LIMIT_EXCEED = "时间超出限制";
    private static final String MEMORY_LIMIT_EXCEED = "内存超出限制";
    private static final String WRONG_ANSWER = "答案错误";
    private static final String ACCEPTED = "答案正确";
    private static final int BATCH_SIZE = 20; // 每批最多处理的测试用例数

    @Autowired
    public JavaJudgeStrategy(
            TestCaseCacheService testCaseCacheService,
            String goJudgeEndpoint,
            RestTemplate restTemplate) {
        this.testCaseCacheService = testCaseCacheService;
        this.restTemplate = restTemplate;
        this.COMPILE_URL = goJudgeEndpoint + "/run";
        this.RUN_URL = goJudgeEndpoint + "/run";
        this.DELETE_URL = goJudgeEndpoint + "/file/{fileId}";
    }

    @Override
    public RunResult judge(String code, String dataZipUrl, Long timeLimit, Long memoryLimit) {
        return getJudgeRunResult(code, dataZipUrl, timeLimit, memoryLimit, null, null);
    }

    @Override
    public RunResult testJudge(String code, String inputExample, String outputExample, Long timeLimit, Long memoryLimit) {
        return getJudgeRunResult(code, null, timeLimit, memoryLimit, inputExample, outputExample);
    }

    private RunResult getJudgeRunResult(String code, String dataZipUrl, Long timeLimit, Long memoryLimit, String inputExample, String outputExample) {
        RunResult result = judgeCode(code, dataZipUrl, timeLimit, memoryLimit, inputExample, outputExample);
        result.setRunTime(result.getTime() / 1000000);
        result.setMemory(result.getMemory() / 1048576);
        switch (result.getStatus()) {
            case "Accepted" -> result.setStatus(ACCEPTED);
            case "Time Limit Exceeded" -> result.setStatus(TIME_LIMIT_EXCEED);
            case "Signalled" -> result.setStatus(MEMORY_LIMIT_EXCEED);
            case "Runtime Error" -> result.setStatus("运行时错误");
        }
        return result;
    }

    private RunResult standardError(String status, String error) {
        RunResult result = new RunResult();
        result.setStatus(status);
        result.setExitStatus(1);
        result.setFiles(new RunResult.Files());
        result.getFiles().setStderr(error);
        return result;
    }

    private RunResult judgeCode(
            String submittedCode, String zipFilePath,
            Long timeLimitMs, Long memoryLimitMB,
            String inputExample, String outExample
    ) {
        // 1. 编译代码
        String classFileId = compileCode(submittedCode);
        if (classFileId == null) {
            return standardError(COMPILE_ERROR, COMPILE_ERROR);
        } else if (classFileId.equals("超出内存限制")) {
            return standardError("超出内存限制", "超出内存限制");
        }

        try {
            List<String[]> testCases = new ArrayList<>();

            if (inputExample != null && outExample != null) {
                testCases.add(new String[]{inputExample, outExample});
            } else {
                // 从缓存或MinIO获取测试用例
                testCases = testCaseCacheService.getTestCases(zipFilePath);
            }

            if (testCases.isEmpty()) {
                return standardError("判题错误，测试用例为空", "无法获取测试用例");
            }

            // 2. 批量执行测试用例
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
                String jsonPayload = buildBatchRunPayload(batch, classFileId, timeLimitMs * 1000000L, memoryLimitMB * 1024 * 1024);
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
                        if ("Signalled".equals(result.getStatus())) {
                            finalResult.setMemory(memoryLimitMB * 1024 * 1024);
                        }
                        finalResult.setStatus(result.getStatus());
                        deleteClassFile(classFileId);
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
                            finalResult.setStatus(WRONG_ANSWER);
                            finalResult.getFiles().setStderr(errorMessage);
                            deleteClassFile(classFileId);
                            return finalResult;
                        }
                    } catch (Exception e) {
                        finalResult.setStatus(WRONG_ANSWER);
                        finalResult.getFiles().setStderr("比较输出出错: " + e.getMessage());
                        deleteClassFile(classFileId);
                        return finalResult;
                    }
                }
            }

            // 3. 删除编译产物
            deleteClassFile(classFileId);
            finalResult.setPassCount(testCases.size());
            return finalResult;

        } catch (Exception e) {
            logger.error("判题过程中出错: ", e);
            return standardError("判题错误", "判题过程中出错: " + e.getMessage());
        }
    }

    private String truncateString(String str, int maxLength) {
        if (str == null) return "null";
        if (str.length() <= maxLength) return str;
        return str.substring(0, maxLength) + "...(截断，总长度:" + str.length() + ")";
    }

    private String compileCode(String code) {
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
                RunResult result = response.getBody().getFirst();
                if ("Accepted".equals(result.getStatus()) && result.getFileIds() != null) {
                    return result.getFileIds().getMainClass();
                } else if ("Memory Limit Exceeded".equals(result.getStatus())) {
                    return MEMORY_LIMIT_EXCEED;
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
        String escapedCode = escapeString(code);

        return String.format("""
    {
        "cmd": [{
            "args": ["/usr/bin/javac", "Main.java"],
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
            "cpuLimit": 30000000000,
            "memoryLimit": 536870912,
            "procLimit": 50,
            "copyIn": {
                "Main.java": {
                    "content": "%s"
                }
            },
            "copyOut": ["stdout", "stderr"],
            "copyOutCached": ["Main.class"]
        }]
    }
    """, escapedCode);
    }

    /**
     * 构建批量运行请求的 JSON payload
     * go-judge 支持在一个请求中包含多个 cmd，会并行执行
     */
    private String buildBatchRunPayload(List<String[]> testCases, String fileId, Long cpuLimit, Long memoryLimit) {
        StringBuilder cmds = new StringBuilder();
        for (int i = 0; i < testCases.size(); i++) {
            if (i > 0) {
                cmds.append(",");
            }
            String input = testCases.get(i)[0];
            cmds.append(buildSingleCmd(input, fileId, cpuLimit, memoryLimit));
        }
        return "{\"cmd\": [" + cmds + "]}";
    }

    /**
     * 构建单个测试用例的 cmd 对象
     */
    private String buildSingleCmd(String input, String fileId, Long cpuLimit, Long memoryLimit) {
        String escapedInput = escapeString(input);

        return String.format("""
            {
                "args": ["/usr/bin/java", "Main"],
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
                    "Main.class": {
                        "fileId": "%s"
                    }
                }
            }""", escapedInput, cpuLimit, memoryLimit, fileId);
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

    private void deleteClassFile(String fileId) {
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
                logger.error("删除编译文件失败，状态码: " + response.getStatusCode());
            }
        } catch (Exception e) {
            logger.error("删除编译文件时发生异常: " + e.getMessage());
        }
    }
}
