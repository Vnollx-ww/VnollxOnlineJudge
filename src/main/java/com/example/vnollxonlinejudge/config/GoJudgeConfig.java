package com.example.vnollxonlinejudge.config;

import com.example.vnollxonlinejudge.judge.GoJudgeRouter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * go-judge 端点配置。
 * <p>
 * 推荐使用 {@code go-judge.endpoints} 列表形式配置多个评测节点，每个节点附带 capacity（同时承载的评测数）：
 * <pre>
 * go-judge:
 *   endpoints:
 *     - url: http://big-server:5050
 *       capacity: 12
 *     - url: http://small-server:5050
 *       capacity: 4
 * </pre>
 * 兼容旧的单端点写法 {@code go-judge.endpoint: http://...}（默认 capacity 取
 * {@code go-judge.default-capacity}，未配置时为 4）。
 */
@Configuration
@ConfigurationProperties(prefix = "go-judge")
public class GoJudgeConfig {

    private String endpoint;
    private List<EndpointConfig> endpoints = new ArrayList<>();
    private int defaultCapacity = 4;

    public static class EndpointConfig {
        private String url;
        private Integer capacity;
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public Integer getCapacity() { return capacity; }
        public void setCapacity(Integer capacity) { this.capacity = capacity; }
    }

    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public List<EndpointConfig> getEndpoints() { return endpoints; }
    public void setEndpoints(List<EndpointConfig> endpoints) { this.endpoints = endpoints; }
    public int getDefaultCapacity() { return defaultCapacity; }
    public void setDefaultCapacity(int defaultCapacity) { this.defaultCapacity = defaultCapacity; }

    @Bean
    public GoJudgeRouter goJudgeRouter() {
        List<GoJudgeRouter.Endpoint> list = new ArrayList<>();
        if (endpoints != null) {
            for (EndpointConfig ec : endpoints) {
                if (ec.getUrl() == null || ec.getUrl().isBlank()) continue;
                int cap = ec.getCapacity() != null ? ec.getCapacity() : defaultCapacity;
                list.add(new GoJudgeRouter.Endpoint(stripTrailingSlash(ec.getUrl()), cap));
            }
        }
        if (list.isEmpty() && endpoint != null && !endpoint.isBlank()) {
            list.add(new GoJudgeRouter.Endpoint(stripTrailingSlash(endpoint), defaultCapacity));
        }
        if (list.isEmpty()) {
            throw new IllegalStateException(
                    "未配置 go-judge 端点：请在 application.yml 中配置 go-judge.endpoints[] 或 go-judge.endpoint");
        }
        return new GoJudgeRouter(list);
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}