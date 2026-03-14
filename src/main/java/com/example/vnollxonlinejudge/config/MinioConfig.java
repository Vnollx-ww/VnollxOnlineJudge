package com.example.vnollxonlinejudge.config;


import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration

public class MinioConfig {

    @Value("http://minio:9000")
    private String endpoint;

    @Value("vnollxvnollx")
    private String accessKey;

    @Value("vnollxvnollxvnollx")
    private String secretKey;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}