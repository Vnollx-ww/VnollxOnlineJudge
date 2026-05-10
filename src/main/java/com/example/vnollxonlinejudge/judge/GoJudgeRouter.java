package com.example.vnollxonlinejudge.judge;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 多 go-judge 端点的加权限流路由。
 * <p>
 * 每个端点持有一个 {@link Semaphore}，许可数等于该端点能同时承载的评测数。
 * 评测进来时按容量从大到小尝试 {@code tryAcquire}：
 * <ul>
 *   <li>有空位的端点立即返回；</li>
 *   <li>所有端点都满则在容量最大的端点上 {@code acquire} 阻塞等待。</li>
 * </ul>
 * 通过 {@link ThreadLocal} 把"当前线程绑定的端点"暴露给本次评测里的所有子请求
 * （编译、运行、清理、checker 编译/运行/删除），保证 fileId 的本地一致性。
 */
public class GoJudgeRouter {

    private static final Logger log = LoggerFactory.getLogger(GoJudgeRouter.class);

    /** 连续失败多少次后熔断该端点。 */
    private static final int FAILURE_THRESHOLD = 3;
    /** 熔断打开时长（ms）。该时间内 acquire 将跳过此端点。 */
    private static final long OPEN_DURATION_MS = 30_000L;

    public static final class Endpoint {
        private final String baseUrl;
        private final String runUrl;
        private final String deleteUrl;
        private final int capacity;
        private final Semaphore semaphore;
        private final AtomicInteger consecutiveFailures = new AtomicInteger();
        private volatile long openUntilMs = 0L;

        public Endpoint(String baseUrl, int capacity) {
            this.baseUrl = baseUrl;
            this.runUrl = baseUrl + "/run";
            this.deleteUrl = baseUrl + "/file/{fileId}";
            this.capacity = capacity;
            // 公平模式：先到先得，避免大端点总是抢到许可
            this.semaphore = new Semaphore(capacity, true);
        }

        public String getBaseUrl() { return baseUrl; }
        public String getRunUrl() { return runUrl; }
        public String getDeleteUrl() { return deleteUrl; }
        public int getCapacity() { return capacity; }
        public int availablePermits() { return semaphore.availablePermits(); }

        /** 端点是否可用（熔断未打开）。 */
        public boolean isHealthy() {
            return openUntilMs <= System.currentTimeMillis();
        }
    }

    private static final ThreadLocal<Endpoint> CURRENT = new ThreadLocal<>();

    private final List<Endpoint> endpoints; // 按 capacity 降序

    public GoJudgeRouter(List<Endpoint> endpoints) {
        if (endpoints == null || endpoints.isEmpty()) {
            throw new IllegalArgumentException("至少需要配置一个 go-judge 端点");
        }
        List<Endpoint> sorted = new ArrayList<>(endpoints);
        sorted.sort(Comparator.comparingInt(Endpoint::getCapacity).reversed());
        this.endpoints = List.copyOf(sorted);
        for (Endpoint ep : this.endpoints) {
            log.info("注册 go-judge 端点: {} capacity={}", ep.baseUrl, ep.capacity);
        }
    }

    /**
     * 占用一个端点许可并绑定到当前线程。
     * 调用方必须在 finally 中调用 {@link #release(Endpoint)}。
     * 优先级：健康且容量大的 > 健康且容量小的 > 不健康（兜底，避免全部熔断时无法评测）。
     */
    public Endpoint acquire() throws InterruptedException {
        // 1) 非阻塞尝试：仅考虑健康端点，容量大的优先
        for (Endpoint ep : endpoints) {
            if (ep.isHealthy() && ep.semaphore.tryAcquire()) {
                CURRENT.set(ep);
                return ep;
            }
        }
        // 2) 健康端点都满：兜底尝试不健康端点（也许已恢复）
        for (Endpoint ep : endpoints) {
            if (!ep.isHealthy() && ep.semaphore.tryAcquire()) {
                log.warn("所有健康 go-judge 端点已满，回退到熔断端点: {}", ep.baseUrl);
                CURRENT.set(ep);
                return ep;
            }
        }
        // 3) 全满则阻塞在容量最大的端点上
        Endpoint biggest = endpoints.get(0);
        log.debug("所有 go-judge 端点已满，阻塞等待: {}", biggest.baseUrl);
        biggest.semaphore.acquire();
        CURRENT.set(biggest);
        return biggest;
    }

    /** 释放许可并解绑线程。null 安全。 */
    public void release(Endpoint ep) {
        CURRENT.remove();
        if (ep != null) {
            ep.semaphore.release();
        }
    }

    /** 上报当前线程绑定端点的一次成功调用：清零失败计数、关闭熔断。 */
    public void recordSuccess() {
        Endpoint ep = CURRENT.get();
        if (ep == null) return;
        if (ep.consecutiveFailures.get() != 0 || ep.openUntilMs != 0L) {
            ep.consecutiveFailures.set(0);
            if (ep.openUntilMs != 0L) {
                log.info("go-judge 端点恢复: {}", ep.baseUrl);
                ep.openUntilMs = 0L;
            }
        }
    }

    /** 上报当前线程绑定端点的一次失败调用：累计失败次数，达到阈值则熔断。 */
    public void recordFailure() {
        Endpoint ep = CURRENT.get();
        if (ep == null) return;
        int n = ep.consecutiveFailures.incrementAndGet();
        if (n >= FAILURE_THRESHOLD && ep.openUntilMs <= System.currentTimeMillis()) {
            ep.openUntilMs = System.currentTimeMillis() + OPEN_DURATION_MS;
            log.warn("go-judge 端点连续失败 {} 次，熔断 {}ms: {}", n, OPEN_DURATION_MS, ep.baseUrl);
        }
    }

    /**
     * 获取当前线程绑定的端点。必须在 {@link #acquire()} 之后调用。
     */
    public Endpoint current() {
        Endpoint ep = CURRENT.get();
        if (ep == null) {
            throw new IllegalStateException("当前线程未绑定 go-judge 端点；请先调用 GoJudgeRouter.acquire()");
        }
        return ep;
    }

    public List<Endpoint> getEndpoints() {
        return endpoints;
    }
}
