package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.service.TestCaseCacheService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class JavascriptJudgeStrategy extends AbstractJudgeStrategy {

    @Autowired
    public JavascriptJudgeStrategy(TestCaseCacheService testCaseCacheService,
                                   SpecialJudgeSupport specialJudgeSupport,
                                   String goJudgeEndpoint,
                                   RestTemplate restTemplate) {
        super(testCaseCacheService, specialJudgeSupport, restTemplate, goJudgeEndpoint);
    }

    @Override
    protected int batchSize() {
        return 1;
    }

    @Override
    protected String compile(String userCode, StringBuilder errorOut) {
        return userCode != null ? userCode : "";
    }

    @Override
    protected String buildRunCmd(String input, String userCode, long cpuLimitNs, long memoryLimitBytes) {
        return String.format("""
        {
            "args": ["/usr/bin/node", "main.js"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": "%s"},
                      {"name": "stdout", "max": 67108864},
                      {"name": "stderr", "max": 1048576}],
            "cpuLimit": %d,
            "memoryLimit": %d,
            "procLimit": 50,
            "copyIn": {"main.js": {"content": "%s"}},
            "copyOut": ["stdout", "stderr"]
        }""", escapeJson(input), cpuLimitNs, memoryLimitBytes, escapeJson(userCode));
    }

    @Override
    protected void cleanupArtifact(String artifactId) {
    }

    @Override
    protected void translateStatus(RunResult result) {
        switch (result.getStatus()) {
            case "Accepted" -> result.setStatus(ACCEPTED);
            case "Time Limit Exceeded" -> result.setStatus(TIME_LIMIT_EXCEED);
            case "Memory Limit Exceeded", "Signalled" -> result.setStatus(MEMORY_LIMIT_EXCEED);
            case "Runtime Error" -> result.setStatus("运行时错误");
        }
    }
}
