package com.example.vnollxonlinejudge.health;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 自定义健康检查指示器
 * 检查关键服务的健康状态
 */
@Component
public class CustomHealthIndicator implements HealthIndicator {

    private final StringRedisTemplate redisTemplate;

    @Autowired
    public CustomHealthIndicator(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public Health health() {
        try {
            // 检查 Redis 连接
            String pong = redisTemplate.getConnectionFactory().getConnection().ping();
            if (!"PONG".equals(pong)) {
                return Health.down()
                        .withDetail("redis", "Redis ping 失败")
                        .build();
            }

            return Health.up()
                    .withDetail("redis", "正常")
                    .withDetail("status", "所有服务运行正常")
                    .build();

        } catch (Exception e) {
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
