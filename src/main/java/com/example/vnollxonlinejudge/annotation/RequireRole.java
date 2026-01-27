package com.example.vnollxonlinejudge.annotation;

import java.lang.annotation.*;

/**
 * 角色校验注解
 * 用于标注需要特定角色才能访问的接口
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequireRole {
    
    /**
     * 需要的角色码
     */
    String[] value() default {};
    
    /**
     * 逻辑类型：AND-需要全部角色，OR-需要任一角色
     */
    RequirePermission.Logical logical() default RequirePermission.Logical.OR;
}
