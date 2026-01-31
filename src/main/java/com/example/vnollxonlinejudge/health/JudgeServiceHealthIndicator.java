package com.example.vnollxonlinejudge.health;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * 判题服务健康检查
 * 检查 RabbitMQ 连接和判题队列状态
 */
@Component("judgeServiceHealth")
public class JudgeServiceHealthIndicator implements HealthIndicator {

    private final RabbitTemplate rabbitTemplate;

    @Autowired
    public JudgeServiceHealthIndicator(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Override
    public Health health() {
        try {
            // 检查 RabbitMQ 连接
            rabbitTemplate.execute(channel -> {
                channel.queueDeclarePassive("judgeQueue");
                return null;
            });

            return Health.up()
                    .withDetail("rabbitMQ", "正常")
                    .withDetail("judgeQueue", "可用")
                    .build();

        } catch (Exception e) {
            return Health.down()
                    .withDetail("error", "判题服务异常: " + e.getMessage())
                    .build();
        }
    }
}
