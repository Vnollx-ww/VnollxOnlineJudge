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
import java.util.List;

@Component
public class PythonJudgeStrategy implements JudgeStrategy {
    private final TestCaseCacheService testCaseCacheService;
    private final RestTemplate restTemplate;
    private final String RUN_URL;
    private static final Logger logger = LoggerFactory.getLogger(PythonJudgeStrategy.class);

    @Autowired
    public PythonJudgeStrategy(
            TestCaseCacheService testCaseCacheService,
            String goJudgeEndpoint,
            RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.testCaseCacheService = testCaseCacheService;
        this.RUN_URL = goJudgeEndpoint + "/run";
    }

    @Override
    public RunResult judge(String code, String dataZipUrl, Long timeLimit, Long memoryLimit) {
        RunResult result = judgeCode(code, dataZipUrl, timeLimit, memoryLimit, null, null);
        // 转换单位及状态码
        return processFinalResult(result);
    }

    @Override
    public RunResult testJudge(String code, String inputExample, String outputExample, Long timeLimit, Long memoryLimit) {
        RunResult result = judgeCode(code, null, timeLimit, memoryLimit, inputExample, outputExample);
        return processFinalResult(result);
    }

    /**
     * 提取结果处理逻辑，减少代码重复
     */
    private RunResult processFinalResult(RunResult result) {
        result.setRunTime(result.getTime() / 1000000); // ns -> ms
        result.setMemory(result.getMemory() / 1048576); // byte -> MB
        switch (result.getStatus()) {
            case "Accepted" -> result.setStatus("答案正确");
            case "Time Limit Exceeded" -> result.setStatus("时间超出限制");
            case "Memory Limit Exceeded" -> result.setStatus("内存超出限制");
            case "Runtime Error" -> result.setStatus("运行时错误");
            case "Wrong Answer" -> result.setStatus("答案错误");
        }
        return result;
    }

    private RunResult judgeCode(
            String submittedCode, String zipFilePath,
            Long timeLimitMs, Long memoryLimitMB,
            String inputExample, String outExample
    ) {
        try {
            List<String[]> testCases = new ArrayList<>();
            if (inputExample != null && outExample != null) {
                testCases.add(new String[]{inputExample, outExample});
            } else {
                testCases = testCaseCacheService.getTestCases(zipFilePath);
            }

            if (testCases.isEmpty()) {
                return standardError("判题错误", "无法获取测试用例");
            }

            // 初始化最终结果对象
            RunResult finalResult = new RunResult();
            finalResult.setStatus("Accepted");
            finalResult.setFiles(new RunResult.Files());
            finalResult.setTime(0L);
            finalResult.setMemory(0L);
            finalResult.setTestCount(testCases.size());
            finalResult.setPassCount(0);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // --- 核心修改：逐一执行测试用例 ---
            for (int i = 0; i < testCases.size(); i++) {
                String[] testCase = testCases.get(i);
                String input = testCase[0];
                String expectedOutput = testCase[1].trim();

                // 构造单次运行请求
                String jsonPayload = buildSingleRunPayload(submittedCode, input, timeLimitMs * 1000000L, memoryLimitMB * 1024 * 1024);
                HttpEntity<String> entity = new HttpEntity<>(jsonPayload, headers);

                // 发送请求给 go-judge
                ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                        RUN_URL,
                        HttpMethod.POST,
                        entity,
                        new ParameterizedTypeReference<List<RunResult>>() {}
                );

                if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().isEmpty()) {
                    return standardError("判题错误", "执行第 " + (i + 1) + " 个测试用例请求失败");
                }

                // 获取当前用例的运行结果
                RunResult currentResult = response.getBody().get(0);

                // 更新最大资源消耗
                finalResult.setTime(Math.max(finalResult.getTime(), currentResult.getTime()));
                finalResult.setMemory(Math.max(finalResult.getMemory(), currentResult.getMemory()));

                // 1. 检查运行状态（是否超时、内存溢出等）
                if (!"Accepted".equals(currentResult.getStatus())) {
                    finalResult.setStatus(currentResult.getStatus());
                    finalResult.setExitStatus(currentResult.getExitStatus());
                    if (currentResult.getFiles() != null) {
                        finalResult.getFiles().setStderr(currentResult.getFiles().getStderr());
                    }
                    return finalResult;
                }

                // 2. 检验输出结果（答案比对）
                String actualOutput = currentResult.getFiles().getStdout() != null ? currentResult.getFiles().getStdout().trim() : "";
                if (!expectedOutput.equals(actualOutput)) {
                    finalResult.setStatus("Wrong Answer"); // 状态标记，后续由 processFinalResult 翻译
                    finalResult.getFiles().setStderr(String.format(
                            "测试用例 %d 失败%n输入: %s%n期待输出: %s%n实际输出: %s",
                            i + 1,
                            truncateString(input, 100),
                            truncateString(expectedOutput, 200),
                            truncateString(actualOutput, 200)
                    ));
                    return finalResult;
                }

                // 记录通过数量
                finalResult.setPassCount(i + 1);
            }

            return finalResult;

        } catch (Exception e) {
            logger.error("判题过程中出错: ", e);
            return standardError("判题错误", "发生异常: " + e.getMessage());
        }
    }

    /**
     * 辅助方法：构建错误返回结果
     */
    private RunResult standardError(String status, String stderr) {
        RunResult result = new RunResult();
        result.setStatus(status);
        result.setFiles(new RunResult.Files());
        result.getFiles().setStderr(stderr);
        result.setExitStatus(1);
        return result;
    }

    private String truncateString(String str, int maxLength) {
        if (str == null) return "null";
        if (str.length() <= maxLength) return str;
        return str.substring(0, maxLength) + "...(截断)";
    }

    /**
     * 构建单个运行请求的 JSON payload (包裹在 cmd 数组中)
     */
    private String buildSingleRunPayload(String code, String input, Long cpuLimit, Long memoryLimit) {
        String escapedCode = escapeString(code);
        String singleCmd = buildSingleCmd(escapedCode, input, cpuLimit, memoryLimit);
        return "{\"cmd\": [" + singleCmd + "]}";
    }

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

    private String escapeString(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
    }
}