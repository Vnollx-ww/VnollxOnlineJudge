package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.service.TestCaseCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 三种语言评测的公共骨架：
 * - 标准评测（standard）：编译 -> 批量运行 -> 输出比对
 * - 构造题评测（special）：编译 -> 编译 checker -> 单个运行 -> checker 判定
 * 子类只需提供：编译、单条运行 cmd、状态翻译、可选批大小。
 */
public abstract class AbstractJudgeStrategy implements JudgeStrategy {
    protected static final Logger log = LoggerFactory.getLogger(AbstractJudgeStrategy.class);

    protected static final String COMPILE_ERROR = "编译错误";
    protected static final String TIME_LIMIT_EXCEED = "时间超出限制";
    protected static final String MEMORY_LIMIT_EXCEED = "内存超出限制";
    protected static final String WRONG_ANSWER = "答案错误";
    protected static final String ACCEPTED = "答案正确";
    protected static final String JUDGE_ERROR = "判题错误";

    protected final TestCaseCacheService testCaseCacheService;
    protected final SpecialJudgeSupport specialJudgeSupport;
    protected final RestTemplate restTemplate;
    protected final String runUrl;
    protected final String deleteUrl;

    protected AbstractJudgeStrategy(TestCaseCacheService testCaseCacheService,
                                    SpecialJudgeSupport specialJudgeSupport,
                                    RestTemplate restTemplate,
                                    String goJudgeEndpoint) {
        this.testCaseCacheService = testCaseCacheService;
        this.specialJudgeSupport = specialJudgeSupport;
        this.restTemplate = restTemplate;
        this.runUrl = goJudgeEndpoint + "/run";
        this.deleteUrl = goJudgeEndpoint + "/file/{fileId}";
    }

    /* ---------------- 模板方法 ---------------- */

    /**
     * 编译用户代码。
     * 成功返回 fileId；编译错误返回 null（错误信息写入 errorOut）；
     * 编译期 MLE 返回 {@link #MEMORY_LIMIT_EXCEED}。
     */
    protected abstract String compile(String userCode, StringBuilder errorOut);

    /** 构建单条 go-judge 运行 cmd 的 JSON 对象（不含外层 cmd 数组）。 */
    protected abstract String buildRunCmd(String input, String artifactId,
                                          long cpuLimitNs, long memoryLimitBytes);

    /** 把 go-judge 原始 status 翻译为面向用户的中文 status；未识别保持原样。 */
    protected abstract void translateStatus(RunResult result);

    /** 一批包含的测试点数量，默认 20。 */
    protected int batchSize() {
        return 20;
    }

    /* ---------------- JudgeStrategy 接口实现 ---------------- */

    @Override
    public final RunResult judge(String code, String dataZipUrl, Long timeLimit, Long memoryLimit) {
        return judge(code, dataZipUrl, timeLimit, memoryLimit, "standard", null);
    }

    @Override
    public final RunResult judge(String code, String dataZipUrl, Long timeLimit, Long memoryLimit,
                                 String judgeMode, String checkerFile) {
        RunResult raw = "special".equals(judgeMode)
                ? specialJudge(code, dataZipUrl, timeLimit, memoryLimit, checkerFile)
                : standardJudge(code, dataZipUrl, timeLimit, memoryLimit, null, null);
        normalizeMetrics(raw);
        translateStatus(raw);
        return raw;
    }

    @Override
    public final RunResult testJudge(String code, String inputExample, String outputExample,
                                     Long timeLimit, Long memoryLimit) {
        RunResult raw = standardJudge(code, null, timeLimit, memoryLimit, inputExample, outputExample);
        normalizeMetrics(raw);
        translateStatus(raw);
        return raw;
    }

    /* ---------------- 标准评测 ---------------- */

    private RunResult standardJudge(String userCode, String zipFilePath,
                                    Long timeLimitMs, Long memoryLimitMB,
                                    String inputExample, String outputExample) {
        StringBuilder errorOut = new StringBuilder();
        String artifactId = compile(userCode, errorOut);
        if (artifactId == null) {
            return errorResult(COMPILE_ERROR, !errorOut.isEmpty() ? errorOut.toString() : COMPILE_ERROR);
        }
        if (MEMORY_LIMIT_EXCEED.equals(artifactId)) {
            return errorResult(MEMORY_LIMIT_EXCEED, MEMORY_LIMIT_EXCEED);
        }
        try {
            List<String[]> testCases = loadTestCases(zipFilePath, inputExample, outputExample);
            if (testCases.isEmpty()) {
                return errorResult("判题错误，测试用例为空", "无法获取测试用例");
            }
            RunResult finalResult = newAcceptedResult(testCases.size());
            HttpHeaders headers = jsonHeaders();
            int batch = Math.max(1, batchSize());
            long cpuLimitNs = timeLimitMs * 1_000_000L;
            long memLimitBytes = memoryLimitMB * 1024 * 1024;

            for (int start = 0; start < testCases.size(); start += batch) {
                int end = Math.min(start + batch, testCases.size());
                List<String[]> sub = testCases.subList(start, end);
                String payload = wrapBatch(sub, artifactId, cpuLimitNs, memLimitBytes);
                List<RunResult> results = invokeRun(payload, headers);
                if (results == null) {
                    finalResult.setStatus(JUDGE_ERROR);
                    finalResult.getFiles().setStderr("Failed to execute batch test cases");
                    return finalResult;
                }
                for (int i = 0; i < results.size(); i++) {
                    RunResult r = results.get(i);
                    String[] tc = sub.get(i);
                    accumulateMetrics(finalResult, r);

                    if (!"Accepted".equals(r.getStatus())) {
                        if ("Signalled".equals(r.getStatus())) {
                            finalResult.setMemory(memLimitBytes);
                        }
                        finalResult.setStatus(r.getStatus());
                        copyOutputs(finalResult, r);
                        return finalResult;
                    }
                    String expected = JudgeOutputComparator.normalizeLineEndings(tc[1]);
                    String actual = JudgeOutputComparator.normalizeLineEndings(
                            r.getFiles() != null ? r.getFiles().getStdout() : "");
                    if (!JudgeOutputComparator.equalsIgnoringWhitespace(expected, actual)) {
                        finalResult.setStatus(WRONG_ANSWER);
                        if (r.getFiles() != null) {
                            finalResult.getFiles().setStdout(r.getFiles().getStdout());
                        }
                        finalResult.getFiles().setStderr(String.format(
                                "测试用例执行失败%n输入: %s%n期待输出: %s%n实际输出: %s",
                                truncate(tc[0], 100), truncate(expected, 200), truncate(actual, 200)));
                        return finalResult;
                    }
                    finalResult.setPassCount(finalResult.getPassCount() + 1);
                }
            }
            return finalResult;
        } catch (Exception e) {
            log.error("判题过程中出错: ", e);
            return errorResult(JUDGE_ERROR, "判题过程中出错: " + e.getMessage());
        } finally {
            cleanupArtifact(artifactId);
        }
    }

    /* ---------------- 构造题评测 ---------------- */

    private RunResult specialJudge(String userCode, String zipFilePath,
                                   Long timeLimitMs, Long memoryLimitMB, String checkerFile) {
        if (checkerFile == null || checkerFile.isBlank()) {
            return errorResult(JUDGE_ERROR, "构造题缺少 checker 文件");
        }
        StringBuilder errorOut = new StringBuilder();
        String artifactId = compile(userCode, errorOut);
        if (artifactId == null) {
            return errorResult(COMPILE_ERROR, !errorOut.isEmpty() ? errorOut.toString() : COMPILE_ERROR);
        }
        if (MEMORY_LIMIT_EXCEED.equals(artifactId)) {
            return errorResult(MEMORY_LIMIT_EXCEED, MEMORY_LIMIT_EXCEED);
        }
        String checkerFileId = null;
        try {
            checkerFileId = specialJudgeSupport.compileChecker(checkerFile);
            List<String[]> testCases = testCaseCacheService.getTestCases(zipFilePath);
            if (testCases.isEmpty()) {
                return errorResult("判题错误，测试用例为空", "无法获取测试用例");
            }
            RunResult finalResult = newAcceptedResult(testCases.size());
            HttpHeaders headers = jsonHeaders();
            long cpuLimitNs = timeLimitMs * 1_000_000L;
            long memLimitBytes = memoryLimitMB * 1024 * 1024;

            for (int i = 0; i < testCases.size(); i++) {
                String[] tc = testCases.get(i);
                String payload = "{\"cmd\": [" + buildRunCmd(tc[0], artifactId, cpuLimitNs, memLimitBytes) + "]}";
                List<RunResult> results = invokeRun(payload, headers);
                if (results == null || results.isEmpty()) {
                    return errorResult(JUDGE_ERROR, "执行第 " + (i + 1) + " 个测试用例请求失败");
                }
                RunResult r = results.getFirst();
                accumulateMetrics(finalResult, r);
                if (!"Accepted".equals(r.getStatus())) {
                    finalResult.setStatus(r.getStatus());
                    copyOutputs(finalResult, r);
                    return finalResult;
                }
                String actual = r.getFiles() != null ? r.getFiles().getStdout() : "";
                RunResult ck = specialJudgeSupport.runChecker(checkerFileId, tc[0], tc[1], actual);
                if (!"Accepted".equals(ck.getStatus()) || ck.getExitStatus() != 0) {
                    finalResult.setStatus(WRONG_ANSWER);
                    finalResult.getFiles().setStdout(actual);
                    finalResult.getFiles().setStderr(friendlySpecialJudgeMessage());
                    return finalResult;
                }
                finalResult.setPassCount(i + 1);
            }
            return finalResult;
        } catch (Exception e) {
            log.error("Special Judge 过程中出错: ", e);
            return errorResult(JUDGE_ERROR, "Special Judge 过程中出错: " + e.getMessage());
        } finally {
            cleanupArtifact(artifactId);
            specialJudgeSupport.deleteCachedFile(checkerFileId);
        }
    }

    /* ---------------- 工具方法 ---------------- */

    /** 子类可以复用：调一次编译请求并把第一条 RunResult 返回，失败返回 null。 */
    protected RunResult invokeCompile(String payload) {
        try {
            ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                    runUrl, HttpMethod.POST,
                    new HttpEntity<>(payload, jsonHeaders()),
                    new ParameterizedTypeReference<List<RunResult>>() {});
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && !response.getBody().isEmpty()) {
                return response.getBody().getFirst();
            }
            log.error("编译请求响应异常: {}", response.getStatusCode());
        } catch (Exception e) {
            log.error("编译请求发生异常: {}", e.getMessage());
        }
        return null;
    }

    private List<RunResult> invokeRun(String payload, HttpHeaders headers) {
        ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                runUrl, HttpMethod.POST,
                new HttpEntity<>(payload, headers),
                new ParameterizedTypeReference<List<RunResult>>() {});
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            log.error("批量判题请求失败");
            return null;
        }
        return response.getBody();
    }

    /** 子类可覆写以跳过/自定义清理（默认按 fileId 删除 go-judge 缓存）。 */
    protected void cleanupArtifact(String artifactId) {
        if (artifactId == null || artifactId.isEmpty() || MEMORY_LIMIT_EXCEED.equals(artifactId)) return;
        try {
            Map<String, String> params = new HashMap<>();
            params.put("fileId", artifactId);
            ResponseEntity<Void> response = restTemplate.exchange(
                    deleteUrl, HttpMethod.DELETE, null, Void.class, params);
            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("删除编译产物失败，状态码: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("删除编译产物时发生异常: {}", e.getMessage());
        }
    }

    private List<String[]> loadTestCases(String zipFilePath, String inputExample, String outputExample) {
        if (inputExample != null && outputExample != null) {
            List<String[]> list = new ArrayList<>();
            list.add(new String[]{inputExample, outputExample});
            return list;
        }
        return testCaseCacheService.getTestCases(zipFilePath);
    }

    private String wrapBatch(List<String[]> batch, String artifactId, long cpuLimitNs, long memLimitBytes) {
        StringBuilder cmds = new StringBuilder();
        for (int i = 0; i < batch.size(); i++) {
            if (i > 0) cmds.append(",");
            cmds.append(buildRunCmd(batch.get(i)[0], artifactId, cpuLimitNs, memLimitBytes));
        }
        return "{\"cmd\": [" + cmds + "]}";
    }

    private RunResult newAcceptedResult(int testCount) {
        RunResult r = new RunResult();
        r.setStatus("Accepted");
        r.setFiles(new RunResult.Files());
        r.getFiles().setStdout("");
        r.getFiles().setStderr("");
        r.setRunTime(0L);
        r.setTime(0L);
        r.setMemory(0L);
        r.setTestCount(testCount);
        r.setPassCount(0);
        return r;
    }

    private void accumulateMetrics(RunResult agg, RunResult r) {
        if (r.getTime() != null) agg.setTime(Math.max(agg.getTime(), r.getTime()));
        if (r.getMemory() != null) agg.setMemory(Math.max(agg.getMemory(), r.getMemory()));
        if (r.getRunTime() != null) agg.setRunTime(Math.max(agg.getRunTime(), r.getRunTime()));
    }

    private void copyOutputs(RunResult dst, RunResult src) {
        if (src.getFiles() == null) return;
        if (dst.getFiles() == null) dst.setFiles(new RunResult.Files());
        dst.getFiles().setStdout(src.getFiles().getStdout());
        dst.getFiles().setStderr(src.getFiles().getStderr());
    }

    private void normalizeMetrics(RunResult result) {
        if (result.getTime() != null) result.setRunTime(result.getTime() / 1_000_000);
        if (result.getMemory() != null) result.setMemory(result.getMemory() / 1_048_576);
    }

    protected RunResult errorResult(String status, String stderr) {
        RunResult result = new RunResult();
        result.setStatus(status);
        result.setExitStatus(1);
        result.setFiles(new RunResult.Files());
        result.getFiles().setStderr(stderr);
        return result;
    }

    private String truncate(String str, int max) {
        if (str == null) return "null";
        return str.length() <= max ? str : str.substring(0, max) + "...";
    }

    /** 构造题：checker 判负时只给选手这一条统一说明。 */
    private static String friendlySpecialJudgeMessage() {
        return "输出的答案未通过检验。";
    }

    private HttpHeaders jsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    protected static String escapeJson(String str) {
        return JudgePayloadJson.escapeString(str);
    }
}
