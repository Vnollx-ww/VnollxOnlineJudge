package com.example.vnollxonlinejudge.annotation;

import java.lang.annotation.*;

/**
 * 权限校验注解
 * 用于标注需要特定权限才能访问的接口
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequirePermission {
    
    /**
     * 需要的权限码
     */
    String[] value() default {};
    
    /**
     * 逻辑类型：AND-需要全部权限，OR-需要任一权限
     */
    Logical logical() default Logical.OR;
    
    /**
     * 权限逻辑枚举
     */
    enum Logical {
        AND, OR
    }
}
