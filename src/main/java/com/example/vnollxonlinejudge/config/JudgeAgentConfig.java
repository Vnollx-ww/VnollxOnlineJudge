package com.example.vnollxonlinejudge.config;

import com.example.vnollxonlinejudge.judge.JudgeAgentRouter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * judge-agent 端点配置。
 *
 * <pre>
 * judge-agent:
 *   endpoints:
 *     - url: http://big-server:8090
 *       capacity: 8
 *     - url: http://small-server:8090
 *       capacity: 2
 *   default-capacity: 2
 * </pre>
 */
@Configuration
@ConfigurationProperties(prefix = "judge-agent")
public class JudgeAgentConfig {

    private List<EndpointConfig> endpoints = new ArrayList<>();
    private int defaultCapacity = 2;

    public static class EndpointConfig {
        private String url;
        private Integer capacity;
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public Integer getCapacity() { return capacity; }
        public void setCapacity(Integer capacity) { this.capacity = capacity; }
    }

    public List<EndpointConfig> getEndpoints() { return endpoints; }
    public void setEndpoints(List<EndpointConfig> endpoints) { this.endpoints = endpoints; }
    public int getDefaultCapacity() { return defaultCapacity; }
    public void setDefaultCapacity(int defaultCapacity) { this.defaultCapacity = defaultCapacity; }

    @Bean
    public JudgeAgentRouter judgeAgentRouter() {
        List<JudgeAgentRouter.Endpoint> list = new ArrayList<>();
        for (EndpointConfig ec : endpoints) {
            if (ec.getUrl() == null || ec.getUrl().isBlank()) continue;
            int cap = ec.getCapacity() != null ? ec.getCapacity() : defaultCapacity;
            list.add(new JudgeAgentRouter.Endpoint(stripTrailingSlash(ec.getUrl()), cap));
        }
        if (list.isEmpty()) {
            throw new IllegalStateException(
                    "未配置 judge-agent 端点：请在 application.yml 中配置 judge-agent.endpoints[]");
        }
        return new JudgeAgentRouter(list);
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
