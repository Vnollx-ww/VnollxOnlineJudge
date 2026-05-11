package com.example.vnollxonlinejudge.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * MinIO 多端点配置。
 *
 * <p>列表中的第一个端点为"主端点"：
 * <ul>
 *   <li>读取（题面、生成头像/图片访问 URL）只走主端点</li>
 *   <li>写入（题目测试数据 zip、checker.cpp）双写到所有端点，保证多机 Agent 看到一致的数据</li>
 * </ul>
 *
 * <pre>
 * minio:
 *   endpoints:
 *     - url: http://minio-a:9000
 *       access-key: xxx
 *       secret-key: yyy
 *     - url: http://minio-b:9000
 *       access-key: xxx
 *       secret-key: yyy
 * </pre>
 */
@Configuration
@ConfigurationProperties(prefix = "minio")
public class MinioProperties {

    private List<Endpoint> endpoints = new ArrayList<>();

    public List<Endpoint> getEndpoints() { return endpoints; }
    public void setEndpoints(List<Endpoint> endpoints) { this.endpoints = endpoints; }

    public Endpoint primary() {
        if (endpoints == null || endpoints.isEmpty()) {
            throw new IllegalStateException("未配置 MinIO 端点：请在 application.yml 中配置 minio.endpoints[]");
        }
        return endpoints.get(0);
    }

    public static class Endpoint {
        private String url;
        private String accessKey;
        private String secretKey;

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getAccessKey() { return accessKey; }
        public void setAccessKey(String accessKey) { this.accessKey = accessKey; }
        public String getSecretKey() { return secretKey; }
        public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
    }
}
