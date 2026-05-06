package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class SpecialJudgeSupport {
    private static final Logger logger = LoggerFactory.getLogger(SpecialJudgeSupport.class);
    private final MinioClient minioClient;
    private final RestTemplate restTemplate;
    private final String runUrl;
    private final String deleteUrl;

    public SpecialJudgeSupport(MinioClient minioClient, RestTemplate restTemplate, String goJudgeEndpoint) {
        this.minioClient = minioClient;
        this.restTemplate = restTemplate;
        this.runUrl = goJudgeEndpoint + "/run";
        this.deleteUrl = goJudgeEndpoint + "/file/{fileId}";
    }

    public String compileChecker(String checkerFile) throws Exception {
        String checkerCode = downloadCheckerCode(checkerFile);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(buildCheckerCompilePayload(checkerCode), headers);
        ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                runUrl,
                HttpMethod.POST,
                entity,
                new ParameterizedTypeReference<List<RunResult>>() {}
        );
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && !response.getBody().isEmpty()) {
            RunResult result = response.getBody().getFirst();
            // 须与 copyOutCached 文件名一致；RunResult.FileIds 仅映射 "a"（与 CppJudgeStrategy 一致）
            if ("Accepted".equals(result.getStatus()) && result.getFileIds() != null) {
                String id = result.getFileIds().getA();
                if (id != null && !id.isBlank()) {
                    return id;
                }
            }
            String stderr = result.getFiles() != null ? result.getFiles().getStderr() : "";
            throw new IllegalStateException("Checker 编译错误: " + stderr);
        }
        throw new IllegalStateException("Checker 编译请求失败");
    }

    public RunResult runChecker(String checkerFileId, String input, String expected, String actual) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(buildCheckerRunPayload(checkerFileId, input, expected, actual), headers);
        ResponseEntity<List<RunResult>> response = restTemplate.exchange(
                runUrl,
                HttpMethod.POST,
                entity,
                new ParameterizedTypeReference<List<RunResult>>() {}
        );
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().isEmpty()) {
            RunResult result = new RunResult();
            result.setStatus("判题错误");
            result.setExitStatus(1);
            result.setFiles(new RunResult.Files());
            result.getFiles().setStderr("Checker 执行失败");
            return result;
        }
        return response.getBody().getFirst();
    }

    public void deleteCachedFile(String fileId) {
        if (fileId == null || fileId.isEmpty()) {
            return;
        }
        try {
            Map<String, String> params = new HashMap<>();
            params.put("fileId", fileId);
            ResponseEntity<Void> response = restTemplate.exchange(deleteUrl, HttpMethod.DELETE, null, Void.class, params);
            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("删除缓存文件失败，状态码: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            logger.error("删除缓存文件时发生异常: {}", e.getMessage());
        }
    }

    private String downloadCheckerCode(String checkerFile) throws Exception {
        try (var stream = minioClient.getObject(GetObjectArgs.builder().bucket("problem").object(checkerFile).build())) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String buildCheckerCompilePayload(String code) {
        return String.format("""
    {
        "cmd": [{
            "args": ["/usr/bin/g++", "checker.cc", "-o", "a"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{
                "content": ""
            }, {
                "name": "stdout",
                "max": 10485760
            }, {
                "name": "stderr",
                "max": 10485760
            }],
            "cpuLimit": 10000000000,
            "memoryLimit": 536870912,
            "procLimit": 50,
            "copyIn": {
                "checker.cc": {
                    "content": "%s"
                }
            },
            "copyOut": ["stdout", "stderr"],
            "copyOutCached": ["a"]
        }]
    }
    """, JudgePayloadJson.escapeString(code));
    }

    /** 与 testlib {@code registerTestlibCmd} / Polygon 一致：参数为 input、output、answer 三个文件名（此处为 input.txt、output.txt、answer.txt）。 */
    private String buildCheckerRunPayload(String checkerFileId, String input, String expected, String actual) {
        return String.format("""
    {"cmd": [{
        "args": ["a", "input.txt", "output.txt", "answer.txt"],
        "env": ["PATH=/usr/bin:/bin"],
        "files": [{
            "content": ""
        }, {
            "name": "stdout",
            "max": 1048576
        }, {
            "name": "stderr",
            "max": 1048576
        }],
        "cpuLimit": 10000000000,
        "memoryLimit": 536870912,
        "procLimit": 50,
        "copyIn": {
            "a": {
                "fileId": "%s"
            },
            "input.txt": {
                "content": "%s"
            },
            "answer.txt": {
                "content": "%s"
            },
            "output.txt": {
                "content": "%s"
            }
        },
        "copyOut": ["stdout", "stderr"]
    }]}
    """, checkerFileId, JudgePayloadJson.escapeString(input), JudgePayloadJson.escapeString(expected), JudgePayloadJson.escapeString(actual));
    }
}
