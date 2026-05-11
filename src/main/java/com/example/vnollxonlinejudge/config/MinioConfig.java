package com.example.vnollxonlinejudge.config;

import io.minio.MinioClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.List;

/**
 * MinIO 客户端配置。
 *
 * <p>提供两个 bean：
 * <ul>
 *   <li>{@code @Primary MinioClient} —— 主端点客户端，给只读 / 生成 URL 等场景注入</li>
 *   <li>{@code List<MinioClient> minioClients} —— 所有端点客户端，给需要双写的上传 / 删除场景使用</li>
 * </ul>
 */
@Configuration
public class MinioConfig {

    private final MinioProperties properties;

    public MinioConfig(MinioProperties properties) {
        this.properties = properties;
    }

    @Bean
    public List<MinioClient> minioClients() {
        if (properties.getEndpoints() == null || properties.getEndpoints().isEmpty()) {
            throw new IllegalStateException("未配置 MinIO 端点：请在 application.yml 中配置 minio.endpoints[]");
        }
        return properties.getEndpoints().stream()
                .map(e -> MinioClient.builder()
                        .endpoint(e.getUrl())
                        .credentials(e.getAccessKey(), e.getSecretKey())
                        .build())
                .toList();
    }

    @Bean
    @Primary
    public MinioClient minioClient(List<MinioClient> minioClients) {
        return minioClients.get(0);
    }
}
