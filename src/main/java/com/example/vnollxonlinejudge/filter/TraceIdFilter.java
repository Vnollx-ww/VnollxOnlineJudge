package com.example.vnollxonlinejudge.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

/**
 * 链路追踪过滤器
 * 为每个请求生成唯一的 TraceId，用于日志追踪
 */
@Component
@Order(-1)
public class TraceIdFilter implements Filter {
    private static final Logger logger = LoggerFactory.getLogger(TraceIdFilter.class);
    
    public static final String TRACE_ID = "traceId";
    public static final String SPAN_ID = "spanId";
    public static final String REQUEST_START_TIME = "requestStartTime";
    
    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;
        
        long startTime = System.currentTimeMillis();
        
        try {
            // 从请求头获取 traceId，如果没有则生成新的
            String traceId = request.getHeader("X-Trace-Id");
            if (traceId == null || traceId.isEmpty()) {
                traceId = generateTraceId();
            }
            
            String spanId = generateSpanId();
            
            // 放入 MDC，日志中可以自动获取
            MDC.put(TRACE_ID, traceId);
            MDC.put(SPAN_ID, spanId);
            MDC.put(REQUEST_START_TIME, String.valueOf(startTime));
            
            // 响应头中也返回 traceId，方便前端调试
            response.setHeader("X-Trace-Id", traceId);
            
            // 记录请求开始
            logger.info("请求开始: {} {} from {}", 
                request.getMethod(), 
                request.getRequestURI(),
                getClientIp(request));
            
            filterChain.doFilter(request, response);
            
        } finally {
            // 记录请求结束和耗时
            long duration = System.currentTimeMillis() - startTime;
            logger.info("请求结束: {} {} 状态码={} 耗时={}ms", 
                request.getMethod(), 
                request.getRequestURI(),
                response.getStatus(),
                duration);
            
            // 清理 MDC
            MDC.remove(TRACE_ID);
            MDC.remove(SPAN_ID);
            MDC.remove(REQUEST_START_TIME);
        }
    }
    
    /**
     * 生成 TraceId（32位）
     */
    private String generateTraceId() {
        return UUID.randomUUID().toString().replace("-", "");
    }
    
    /**
     * 生成 SpanId（16位）
     */
    private String generateSpanId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
    
    /**
     * 获取客户端真实IP
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
    
    @Override
    public void init(FilterConfig filterConfig) {
        logger.info("TraceIdFilter 初始化完成");
    }
    
    @Override
    public void destroy() {
        logger.info("TraceIdFilter 销毁");
    }
}
