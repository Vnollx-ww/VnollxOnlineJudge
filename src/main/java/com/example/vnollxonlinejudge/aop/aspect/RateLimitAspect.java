package com.example.vnollxonlinejudge.aop.aspect;

import com.example.vnollxonlinejudge.annotation.RateLimit;
import com.example.vnollxonlinejudge.exception.RateLimitException;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.List;

/**
 * 限流切面
 * 使用Redis实现滑动窗口限流
 */
@Aspect
@Component
public class RateLimitAspect {
    private static final Logger logger = LoggerFactory.getLogger(RateLimitAspect.class);
    private static final String RATE_LIMIT_KEY_PREFIX = "rate_limit:";

    private final StringRedisTemplate stringRedisTemplate;

    // Lua脚本实现原子性的滑动窗口限流
    private static final String LUA_SCRIPT = """
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local current_time = tonumber(ARGV[3])
            local window_start = current_time - window * 1000
            
            -- 移除窗口外的请求记录
            redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
            
            -- 获取当前窗口内的请求数量
            local count = redis.call('ZCARD', key)
            
            if count < limit then
                -- 未超过限制，添加当前请求
                redis.call('ZADD', key, current_time, current_time .. '-' .. math.random())
                redis.call('EXPIRE', key, window)
                return 1
            else
                -- 超过限制
                return 0
            end
            """;

    @Autowired
    public RateLimitAspect(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }

    @Around("@annotation(rateLimit)")
    public Object around(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        
        // 构建限流key
        String rateLimitKey = buildRateLimitKey(joinPoint, rateLimit, request);
        
        // 执行限流检查
        boolean allowed = isAllowed(rateLimitKey, rateLimit.count(), rateLimit.time());
        
        if (!allowed) {
            logger.warn("触发限流: key={}, limit={}/{} 秒", rateLimitKey, rateLimit.count(), rateLimit.time());
            throw new RateLimitException(rateLimit.message());
        }
        
        return joinPoint.proceed();
    }

    /**
     * 构建限流key
     */
    private String buildRateLimitKey(ProceedingJoinPoint joinPoint, RateLimit rateLimit, HttpServletRequest request) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        
        String key = rateLimit.key();
        if (key.isEmpty()) {
            key = method.getDeclaringClass().getName() + "." + method.getName();
        }
        
        StringBuilder keyBuilder = new StringBuilder(RATE_LIMIT_KEY_PREFIX);
        keyBuilder.append(key);
        
        switch (rateLimit.limitType()) {
            case IP -> keyBuilder.append(":").append(getClientIp(request));
            case USER -> {
                Object uid = request.getAttribute("uid");
                if (uid != null) {
                    keyBuilder.append(":user:").append(uid);
                } else {
                    // 未登录用户降级为IP限流
                    keyBuilder.append(":").append(getClientIp(request));
                }
            }
            case ALL -> keyBuilder.append(":global");
        }
        
        return keyBuilder.toString();
    }

    /**
     * 获取客户端真实IP
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // 多个代理时，取第一个IP
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    /**
     * 使用Lua脚本判断是否允许请求
     */
    private boolean isAllowed(String key, int limit, int window) {
        try {
            DefaultRedisScript<Long> redisScript = new DefaultRedisScript<>();
            redisScript.setScriptText(LUA_SCRIPT);
            redisScript.setResultType(Long.class);

            List<String> keys = Collections.singletonList(key);
            long currentTime = System.currentTimeMillis();
            
            Long result = stringRedisTemplate.execute(redisScript, keys, 
                    String.valueOf(limit), String.valueOf(window), String.valueOf(currentTime));
            
            return result != null && result == 1L;
        } catch (Exception e) {
            logger.error("限流检查异常，默认放行: {}", e.getMessage());
            // 限流服务异常时默认放行，避免影响正常业务
            return true;
        }
    }
}
