package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.service.TestCaseCacheService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * Python 不需要编译：通过把用户代码作为 "artifactId" 透传，
 * 在 buildRunCmd 中直接以 copyIn.content 形式嵌入 main.py。
 */
@Component
public class PythonJudgeStrategy extends AbstractJudgeStrategy {

    @Autowired
    public PythonJudgeStrategy(TestCaseCacheService testCaseCacheService,
                               SpecialJudgeSupport specialJudgeSupport,
                               String goJudgeEndpoint,
                               RestTemplate restTemplate) {
        super(testCaseCacheService, specialJudgeSupport, restTemplate, goJudgeEndpoint);
    }

    @Override
    protected int batchSize() {
        // Python 解释型按现有行为单条执行
        return 1;
    }

    @Override
    protected String compile(String userCode, StringBuilder errorOut) {
        // 直接把源码作为"产物"返回，buildRunCmd 中作为 copyIn.content 嵌入
        return userCode != null ? userCode : "";
    }

    @Override
    protected String buildRunCmd(String input, String userCode, long cpuLimitNs, long memoryLimitBytes) {
        return String.format("""
        {
            "args": ["/usr/bin/python3", "main.py"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": "%s"},
                      {"name": "stdout", "max": 67108864},
                      {"name": "stderr", "max": 1048576}],
            "cpuLimit": %d,
            "memoryLimit": %d,
            "procLimit": 50,
            "copyIn": {"main.py": {"content": "%s"}},
            "copyOut": ["stdout", "stderr"]
        }""", escapeJson(input), cpuLimitNs, memoryLimitBytes, escapeJson(userCode));
    }

    @Override
    protected void cleanupArtifact(String artifactId) {
        // Python 直接 inline 源码，没有缓存产物可清理
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
