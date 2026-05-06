package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.service.TestCaseCacheService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class JavaJudgeStrategy extends AbstractJudgeStrategy {

    @Autowired
    public JavaJudgeStrategy(TestCaseCacheService testCaseCacheService,
                             SpecialJudgeSupport specialJudgeSupport,
                             String goJudgeEndpoint,
                             RestTemplate restTemplate) {
        super(testCaseCacheService, specialJudgeSupport, restTemplate, goJudgeEndpoint);
    }

    @Override
    protected String compile(String userCode, StringBuilder errorOut) {
        String payload = String.format("""
        {"cmd": [{
            "args": ["/usr/bin/javac", "Main.java"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": ""},
                      {"name": "stdout", "max": 10485760},
                      {"name": "stderr", "max": 10485760}],
            "cpuLimit": 30000000000,
            "memoryLimit": 536870912,
            "procLimit": 50,
            "copyIn": {"Main.java": {"content": "%s"}},
            "copyOut": ["stdout", "stderr"],
            "copyOutCached": ["Main.class"]
        }]}
        """, escapeJson(userCode));
        RunResult result = invokeCompile(payload);
        if (result == null) return null;
        if ("Accepted".equals(result.getStatus()) && result.getFileIds() != null) {
            return result.getFileIds().getMainClass();
        }
        if ("Memory Limit Exceeded".equals(result.getStatus())) return MEMORY_LIMIT_EXCEED;
        if (result.getFiles() != null && result.getFiles().getStderr() != null) {
            errorOut.append(result.getFiles().getStderr());
        }
        return null;
    }

    @Override
    protected String buildRunCmd(String input, String artifactId, long cpuLimitNs, long memoryLimitBytes) {
        return String.format("""
        {
            "args": ["/usr/bin/java", "-Djava.security.policy=", "Main"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": "%s"},
                      {"name": "stdout", "max": 67108864},
                      {"name": "stderr", "max": 1048576}],
            "cpuLimit": %d,
            "memoryLimit": %d,
            "procLimit": 50,
            "copyIn": {"Main.class": {"fileId": "%s"}}
        }""", escapeJson(input), cpuLimitNs, memoryLimitBytes, artifactId);
    }

    @Override
    protected void translateStatus(RunResult result) {
        switch (result.getStatus()) {
            case "Accepted" -> result.setStatus(ACCEPTED);
            case "Time Limit Exceeded" -> result.setStatus(TIME_LIMIT_EXCEED);
            case "Signalled" -> result.setStatus(MEMORY_LIMIT_EXCEED);
            case "Runtime Error" -> result.setStatus("运行时错误");
        }
    }
}
