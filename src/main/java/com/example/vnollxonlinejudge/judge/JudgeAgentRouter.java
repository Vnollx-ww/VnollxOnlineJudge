package com.example.vnollxonlinejudge.judge;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 多 judge-agent 节点加权限流路由。每个 endpoint 持有 Semaphore，
 * 评测进来按 capacity 从大到小尝试占用，全满则阻塞等容量最大的端点释放。
 * 连续失败达到阈值后熔断该端点一段时间。
 */
public class JudgeAgentRouter {
    private static final Logger log = LoggerFactory.getLogger(JudgeAgentRouter.class);
    private static final int FAILURE_THRESHOLD = 3;
    private static final long OPEN_DURATION_MS = 30_000L;
    private final AtomicInteger requestSeq = new AtomicInteger();

    public static final class Endpoint {
        private final String baseUrl;
        private final String submitUrl;
        private final String sampleUrl;
        private final int capacity;
        private final Semaphore semaphore;
        private final AtomicInteger consecutiveFailures = new AtomicInteger();
        private volatile long openUntilMs = 0L;

        public Endpoint(String baseUrl, int capacity) {
            this.baseUrl = baseUrl;
            this.submitUrl = baseUrl + "/judge/submit";
            this.sampleUrl = baseUrl + "/judge/run-sample";
            this.capacity = capacity;
            this.semaphore = new Semaphore(capacity, true);
        }

        public String getBaseUrl() { return baseUrl; }
        public String getSubmitUrl() { return submitUrl; }
        public String getSampleUrl() { return sampleUrl; }
        public int getCapacity() { return capacity; }
        public int availablePermits() { return semaphore.availablePermits(); }
        public boolean isHealthy() { return openUntilMs <= System.currentTimeMillis(); }
    }

    private final List<Endpoint> endpoints;

    public JudgeAgentRouter(List<Endpoint> endpoints) {
        if (endpoints == null || endpoints.isEmpty()) {
            throw new IllegalArgumentException("至少需要配置一个 judge-agent 端点");
        }
        List<Endpoint> sorted = new ArrayList<>(endpoints);
        sorted.sort(Comparator.comparingInt(Endpoint::getCapacity).reversed());
        this.endpoints = List.copyOf(sorted);
        for (Endpoint ep : this.endpoints) {
            log.info("注册 judge-agent 端点: {} capacity={}", ep.baseUrl, ep.capacity);
        }
    }

    /**
     * 占用一个端点许可。优先健康且容量大的端点；全部不健康时回退占用熔断中的端点；
     * 全满时阻塞等待容量最大的端点释放。调用方必须在 finally 中调用 release。
     */
    public Endpoint acquire() throws InterruptedException {
        Endpoint primary = endpoints.get(0);
        Endpoint secondary = endpoints.size() > 1 ? endpoints.get(1) : null;
        int seq = requestSeq.getAndIncrement();
        boolean preferSecondary = seq % 2 == 1
                && secondary != null
                && primary.availablePermits() < primary.getCapacity();

        if (preferSecondary && secondary.isHealthy() && secondary.semaphore.tryAcquire()) {
            return secondary;
        }
        if (primary.isHealthy()) {
            primary.semaphore.acquire();
            return primary;
        }
        if (secondary != null && secondary.isHealthy() && secondary.semaphore.tryAcquire()) {
            return secondary;
        }
        if (primary.semaphore.tryAcquire()) {
            log.warn("所有健康 judge-agent 端点不可用，回退到熔断主端点: {}", primary.baseUrl);
            return primary;
        }
        log.debug("主 judge-agent 端点已满，阻塞等待: {}", primary.baseUrl);
        primary.semaphore.acquire();
        return primary;
    }

    public void release(Endpoint ep) {
        if (ep != null) {
            ep.semaphore.release();
        }
    }

    public void recordSuccess(Endpoint ep) {
        if (ep == null) return;
        if (ep.consecutiveFailures.get() != 0 || ep.openUntilMs != 0L) {
            ep.consecutiveFailures.set(0);
            if (ep.openUntilMs != 0L) {
                log.info("judge-agent 端点恢复: {}", ep.baseUrl);
                ep.openUntilMs = 0L;
            }
        }
    }

    public void recordFailure(Endpoint ep) {
        if (ep == null) return;
        int n = ep.consecutiveFailures.incrementAndGet();
        if (n >= FAILURE_THRESHOLD && ep.openUntilMs <= System.currentTimeMillis()) {
            ep.openUntilMs = System.currentTimeMillis() + OPEN_DURATION_MS;
            log.warn("judge-agent 端点连续失败 {} 次，熔断 {}ms: {}", n, OPEN_DURATION_MS, ep.baseUrl);
        }
    }

    public List<Endpoint> getEndpoints() {
        return endpoints;
    }
}
