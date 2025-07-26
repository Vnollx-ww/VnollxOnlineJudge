package com.example.vnollxonlinejudge.aop.aspect;

import com.example.vnollxonlinejudge.exception.BusinessException;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Aspect
@Component
public class ServiceExceptionAspect {
    private static final Logger logger = LoggerFactory.getLogger(ServiceExceptionAspect.class);

    @Around("execution(* com.example.vnollxonlinejudge.service..*.*(..))")
    public Object handleServiceExceptions(ProceedingJoinPoint joinPoint) throws Throwable {
        try {
            return joinPoint.proceed(); // 执行目标方法
        } catch (BusinessException e) {
            throw e; // 业务异常直接抛出
        } catch (Exception e) {
            logger.error("服务层出现异常！！！",e);
            throw new RuntimeException("服务器错误，请联系管理员");
        }
    }
}