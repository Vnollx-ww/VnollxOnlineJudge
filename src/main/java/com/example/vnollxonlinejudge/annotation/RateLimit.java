package com.example.vnollxonlinejudge.annotation;

import java.lang.annotation.*;

/**
 * 限流注解
 * 用于标记需要限流的接口
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RateLimit {
    /**
     * 限流key前缀，默认使用方法名
     */
    String key() default "";

    /**
     * 时间窗口（秒），默认60秒
     */
    int time() default 60;

    /**
     * 时间窗口内最大请求次数，默认100次
     */
    int count() default 100;

    /**
     * 限流类型：IP（基于IP限流）、USER（基于用户ID限流）、ALL（全局限流）
     */
    LimitType limitType() default LimitType.IP;

    /**
     * 限流提示信息
     */
    String message() default "请求过于频繁，请稍后再试";

    enum LimitType {
        IP,      // 基于IP限流
        USER,    // 基于用户ID限流
        ALL      // 全局限流
    }
}
