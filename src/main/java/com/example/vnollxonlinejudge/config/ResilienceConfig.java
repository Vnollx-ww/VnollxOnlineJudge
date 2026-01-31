package com.example.vnollxonlinejudge.config;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * 熔断降级配置
 * 使用 Resilience4j 实现服务熔断和降级
 */
@Configuration
public class ResilienceConfig {

    /**
     * 熔断器注册中心
     */
    @Bean
    public CircuitBreakerRegistry circuitBreakerRegistry() {
        CircuitBreakerConfig defaultConfig = CircuitBreakerConfig.custom()
                // 滑动窗口类型：基于计数
                .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
                // 滑动窗口大小
                .slidingWindowSize(10)
                // 最小调用次数（达到后才计算失败率）
                .minimumNumberOfCalls(5)
                // 失败率阈值（超过则打开熔断器）
                .failureRateThreshold(50)
                // 熔断器打开后等待时间
                .waitDurationInOpenState(Duration.ofSeconds(30))
                // 半开状态允许的调用次数
                .permittedNumberOfCallsInHalfOpenState(3)
                // 慢调用阈值（超过此时间视为慢调用）
                .slowCallDurationThreshold(Duration.ofSeconds(5))
                // 慢调用率阈值
                .slowCallRateThreshold(80)
                // 自动从半开状态转换
                .automaticTransitionFromOpenToHalfOpenEnabled(true)
                .build();

        return CircuitBreakerRegistry.of(defaultConfig);
    }

    /**
     * 判题服务熔断器
     */
    @Bean
    public CircuitBreaker judgeCircuitBreaker(CircuitBreakerRegistry registry) {
        CircuitBreakerConfig judgeConfig = CircuitBreakerConfig.custom()
                .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
                .slidingWindowSize(20)
                .minimumNumberOfCalls(10)
                .failureRateThreshold(60)
                .waitDurationInOpenState(Duration.ofSeconds(60))
                .permittedNumberOfCallsInHalfOpenState(5)
                .slowCallDurationThreshold(Duration.ofSeconds(30))
                .slowCallRateThreshold(70)
                .automaticTransitionFromOpenToHalfOpenEnabled(true)
                .build();

        return registry.circuitBreaker("judgeService", judgeConfig);
    }

    /**
     * AI 服务熔断器（AI 服务可能不稳定，需要更严格的熔断）
     */
    @Bean
    public CircuitBreaker aiCircuitBreaker(CircuitBreakerRegistry registry) {
        CircuitBreakerConfig aiConfig = CircuitBreakerConfig.custom()
                .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
                .slidingWindowSize(10)
                .minimumNumberOfCalls(3)
                .failureRateThreshold(40)
                .waitDurationInOpenState(Duration.ofSeconds(120))
                .permittedNumberOfCallsInHalfOpenState(2)
                .slowCallDurationThreshold(Duration.ofSeconds(60))
                .slowCallRateThreshold(50)
                .automaticTransitionFromOpenToHalfOpenEnabled(true)
                .build();

        return registry.circuitBreaker("aiService", aiConfig);
    }

    /**
     * 外部服务熔断器（通用外部调用）
     */
    @Bean
    public CircuitBreaker externalCircuitBreaker(CircuitBreakerRegistry registry) {
        CircuitBreakerConfig externalConfig = CircuitBreakerConfig.custom()
                .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.TIME_BASED)
                .slidingWindowSize(60)
                .minimumNumberOfCalls(10)
                .failureRateThreshold(50)
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .permittedNumberOfCallsInHalfOpenState(5)
                .automaticTransitionFromOpenToHalfOpenEnabled(true)
                .build();

        return registry.circuitBreaker("externalService", externalConfig);
    }
}
