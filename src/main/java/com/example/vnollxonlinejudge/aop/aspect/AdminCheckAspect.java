package com.example.vnollxonlinejudge.aop.aspect;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.exception.PermissionDeniedException;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.tomcat.websocket.AuthenticationException;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
public class AdminCheckAspect {
    @Before("execution(* com.example.vnollxonlinejudge.controller.Admin*.*(..))")
    public void checkAdminIdentity() {
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
