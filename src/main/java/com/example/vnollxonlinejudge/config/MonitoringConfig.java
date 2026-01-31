package com.example.vnollxonlinejudge.config;

import io.micrometer.core.aop.TimedAspect;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 监控指标配置
 * 配置自定义业务指标用于 Prometheus 监控
 */
@Configuration
public class MonitoringConfig {

    /**
     * 启用 @Timed 注解支持
     */
    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }

    /**
     * 判题请求计数器
     */
    @Bean
    public Counter judgeRequestCounter(MeterRegistry registry) {
        return Counter.builder("judge.request.total")
                .description("判题请求总数")
                .tag("type", "submission")
                .register(registry);
    }

    /**
     * 判题成功计数器
     */
    @Bean
    public Counter judgeSuccessCounter(MeterRegistry registry) {
        return Counter.builder("judge.success.total")
                .description("判题成功总数")
                .tag("result", "success")
                .register(registry);
    }

    /**
     * 判题失败计数器
     */
    @Bean
    public Counter judgeFailureCounter(MeterRegistry registry) {
        return Counter.builder("judge.failure.total")
                .description("判题失败总数")
                .tag("result", "failure")
                .register(registry);
    }

    /**
     * 用户登录计数器
     */
    @Bean
    public Counter loginCounter(MeterRegistry registry) {
        return Counter.builder("user.login.total")
                .description("用户登录总数")
                .register(registry);
    }

    /**
     * API 请求计时器
     */
    @Bean
    public Timer apiRequestTimer(MeterRegistry registry) {
        return Timer.builder("api.request.duration")
                .description("API请求耗时")
                .register(registry);
    }

    /**
     * WebSocket 连接计数器
     */
    @Bean
    public Counter websocketConnectionCounter(MeterRegistry registry) {
        return Counter.builder("websocket.connection.total")
                .description("WebSocket连接总数")
                .register(registry);
    }
}
