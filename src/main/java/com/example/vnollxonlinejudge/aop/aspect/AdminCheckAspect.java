package com.example.vnollxonlinejudge.aop.aspect;

import com.example.vnollxonlinejudge.annotation.SkipAdminCheck;
import com.example.vnollxonlinejudge.exception.PermissionDeniedException;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;

@Aspect
@Component
public class AdminCheckAspect {
    @Before("execution(* com.example.vnollxonlinejudge.controller.Admin*.*(..))")
    public void checkAdminIdentity(JoinPoint joinPoint) {
        // 检查方法是否有跳过注解
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        if (method.isAnnotationPresent(SkipAdminCheck.class)) {
            return;
        }

        // 获取当前请求
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();

        // 从请求属性中获取身份信息
        String identity = (String) request.getAttribute("identity");

        // 检查身份
        if (identity == null || identity.trim().isEmpty() || identity.equals("USER")) {
            throw new PermissionDeniedException("权限不足，需要管理员权限");
        }
    }
}
