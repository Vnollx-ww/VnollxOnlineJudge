package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.service.TestCaseCacheService;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
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
public class CppJudgeStrategy implements JudgeStrategy {
    private final TestCaseCacheService testCaseCacheService;
    private final RestTemplate restTemplate; // 注入配置了连接池的 RestTemplate
    private final String COMPILE_URL ;
    private final String RUN_URL  ;
    private final String DELETE_URL ;
    private static final Logger logger = LoggerFactory.getLogger(CppJudgeStrategy.class);

    private static final String COMPILE_ERROR="编译错误";
    private static final String TIME_LIMIT_EXCEED="时间超出限制";
    private static final String MEMORY_LIMIT_EXCEED="内存超出限制";

    private static final String WRONG_ANSWER="答案错误";
    private static final String ACCEPTED="答案正确";

    @Autowired
    public CppJudgeStrategy(
            TestCaseCacheService testCaseCacheService,
            String goJudgeEndpoint,
            RestTemplate restTemplate) {
        this.testCaseCacheService = testCaseCacheService;
        this.restTemplate=restTemplate;
        this.COMPILE_URL = goJudgeEndpoint + "/run";
        this.RUN_URL = goJudgeEndpoint + "/run";
        this.DELETE_URL = goJudgeEndpoint + "/file/{fileId}";
    }

    @Override
    public RunResult judge(String code, String dataZipUrl, Long timeLimit, Long memoryLimit) {
        RunResult result = judgeCode(code, dataZipUrl, timeLimit, memoryLimit,null,null);
        result.setRunTime(result.getTime() / 1000000);
        result.setMemory(result.getMemory()/1048576);
        switch (result.getStatus()) {
            case "Accepted" -> result.setStatus(ACCEPTED);
            case "Time Limit Exceeded" -> result.setStatus(TIME_LIMIT_EXCEED);
            case "Signalled" -> result.setStatus(MEMORY_LIMIT_EXCEED);
        }

        return result;
    }

    @Override
    public RunResult testJudge(String code, String inputExample, String outputExample, Long timeLimit, Long memoryLimit) {
        RunResult result = judgeCode(code, null, timeLimit, memoryLimit,inputExample,outputExample);
        result.setRunTime(result.getTime() / 1000000);
        result.setMemory(result.getMemory()/1048576);
        switch (result.getStatus()) {
            case "Accepted" -> result.setStatus(ACCEPTED);
            case "Time Limit Exceeded" -> result.setStatus(TIME_LIMIT_EXCEED);
            case "Signalled" -> result.setStatus(MEMORY_LIMIT_EXCEED);
        }

        return result;
    }

    private RunResult standardError(String status,String error){
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
            String inputExample,String outExample
    ) {
        // 1. Compile code
        String binaryFileId = compileCode(submittedCode);
        if (binaryFileId == null) {
            return standardError(COMPILE_ERROR,COMPILE_ERROR);
        }
        else if (binaryFileId.equals("超出内存限制")){
            return standardError("超出内存限制","超出内存限制");
        }

        try {
            List<String[]> testCases =new ArrayList<>();

            if (inputExample!=null&&outExample!=null){
                testCases.add(new String[]{inputExample,outExample});
            }else{
                //从缓存或MinIO获取测试用例
                testCases =testCaseCacheService.getTestCases(zipFilePath);
            }

            if (testCases.isEmpty()) {
                return standardError("判题错误，测试用例为空","无法获取测试用例");
            }

            // 3. Execute test cases
            RunResult finalResult = new RunResult();
            finalResult.setStatus("Accepted");
            finalResult.setFiles(new RunResult.Files());
            finalResult.getFiles().setStdout("");
            finalResult.getFiles().setStderr("");
            finalResult.setRunTime(0L);
            finalResult.setTime(0L);
            finalResult.setMemory(0L);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            for (String[] testCase : testCases) {
                String input = testCase[0] + " " + testCase[1];
                String jsonPayload = buildRunPayload(input, binaryFileId, timeLimitMs * 1000000L, memoryLimitMB * 1024 * 1024);
                HttpEntity<String> entity = new HttpEntity<>(jsonPayload, headers);

                // 使用连接池发送请求
                ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                        RUN_URL,
                        HttpMethod.POST,
                        entity,
                        new ParameterizedTypeReference<List<RunResult>>() {}
                );

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    RunResult result = response.getBody().get(0);
                    // 计算时间和内存
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

                    // 检验结果
                    try {
                        String expectedOutput = testCase[1];
                        String actualOutput = result.getFiles().getStdout().trim();

                        if (!expectedOutput.equals(actualOutput)) {
                            String errorMessage = String.format(
                                    "测试用例执行失败%n输入: %s%n期待输出: %s%n实际输出: %s",
                                    truncateString(testCase[0], 100),      // 输入限制100
                                    truncateString(expectedOutput, 200),   // 输出限制200
                                    truncateString(actualOutput, 200)      // 输出限制200
                            );
                            finalResult.setStatus(WRONG_ANSWER);
                            finalResult.getFiles().setStderr(errorMessage);
                            return finalResult;
                        }
                    } catch (Exception e) {
                        finalResult.setStatus(WRONG_ANSWER);
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

            // 4. Delete compiled binary
            deleteBinaryFile(binaryFileId);

            return finalResult;

        } catch (Exception e) {
            logger.error("判题过程中出错: ", e);
            return standardError("判题错误","判题过程中出错: " + e.getMessage());
        }
    }

    private String truncateString(String str, int maxLength) {
        if (str == null) return "null";
        if (str.length() <= maxLength) return str;
        return str.substring(0, maxLength) + "...(截断，总长度:" + str.length() + ")";
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

    private void deleteBinaryFile(String fileId) {
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