package com.example.vnollxonlinejudge.aop.aspect;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Arrays;
@Aspect
@Component
public class RedisExceptionAspect {
    private static final Logger logger = LoggerFactory.getLogger(RedisExceptionAspect.class);
    @Around("execution(* com.example.vnollxonlinejudge.service.serviceImpl.RedisServiceImpl.*(..))")
    public Object handleRedisExceptions(ProceedingJoinPoint joinPoint)  {
        try {
            return joinPoint.proceed(); // 执行目标方法
        } catch (Throwable e) {
            logger.error("Redis服务层异常 - 方法: {}, 参数: {}",
                    joinPoint.getSignature().getName(),
                    Arrays.toString(joinPoint.getArgs()),
                    e);
        }
        return null;
    }
}
