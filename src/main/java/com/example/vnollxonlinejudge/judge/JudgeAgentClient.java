package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * 多 judge-agent 客户端。
 * 通过 {@link JudgeAgentRouter} 选端点并做限流/熔断，全部评测业务逻辑下沉到 Agent。
 */
@Component
public class JudgeAgentClient {
    private static final Logger logger = LoggerFactory.getLogger(JudgeAgentClient.class);
    private static final String STATUS_JUDGE_ERROR = "判题错误";

    private final RestTemplate restTemplate;
    private final JudgeAgentRouter router;

    public JudgeAgentClient(RestTemplate restTemplate, JudgeAgentRouter router) {
        this.restTemplate = restTemplate;
        this.router = router;
    }

    public RunResult submit(AgentSubmitRequest req) {
        return call(req, true);
    }

    public RunResult runSample(AgentSampleRequest req) {
        return call(req, false);
    }

    private RunResult call(Object payload, boolean submit) {
        JudgeAgentRouter.Endpoint ep = null;
        try {
            ep = router.acquire();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String url = submit ? ep.getSubmitUrl() : ep.getSampleUrl();
            ResponseEntity<RunResult> resp = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(payload, headers), RunResult.class);
            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                router.recordFailure(ep);
                logger.error("judge-agent 调用失败: status={}", resp.getStatusCode());
                return errorResult("judge-agent 调用失败");
            }
            router.recordSuccess(ep);
            return resp.getBody();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return errorResult("评测被中断");
        } catch (Exception e) {
            router.recordFailure(ep);
            logger.error("judge-agent 调用异常: {}", e.getMessage(), e);
            return errorResult("judge-agent 调用异常: " + e.getMessage());
        } finally {
            router.release(ep);
        }
    }

    private RunResult errorResult(String stderr) {
        RunResult r = new RunResult();
        r.setStatus(STATUS_JUDGE_ERROR);
        r.setExitStatus(1);
        RunResult.Files files = new RunResult.Files();
        files.setStderr(stderr);
        r.setFiles(files);
        return r;
    }
}
