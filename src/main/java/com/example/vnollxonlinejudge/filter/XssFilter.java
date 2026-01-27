package com.example.vnollxonlinejudge.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

/**
 * XSS过滤器
 * 过滤所有请求中的XSS攻击内容
 */
@Component
@Order(0)
public class XssFilter implements Filter {
    private static final Logger logger = LoggerFactory.getLogger(XssFilter.class);

    // 排除的路径（如文件上传等需要原始内容的接口）
    private static final List<String> EXCLUDED_PATHS = Arrays.asList(
            "/admin/upload",
            "/problem/upload"
    );

    // 排除的Content-Type
    private static final List<String> EXCLUDED_CONTENT_TYPES = Arrays.asList(
            "multipart/form-data"
    );

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String requestURI = request.getRequestURI();
        String contentType = request.getContentType();

        // 检查是否在排除列表中
        boolean excluded = false;
        for (String path : EXCLUDED_PATHS) {
            if (requestURI.startsWith(path)) {
                excluded = true;
                break;
            }
        }

        // 检查Content-Type是否在排除列表中
        if (!excluded && contentType != null) {
            for (String excludedContentType : EXCLUDED_CONTENT_TYPES) {
                if (contentType.toLowerCase().contains(excludedContentType)) {
                    excluded = true;
                    break;
                }
            }
        }

        if (excluded) {
            filterChain.doFilter(request, response);
            return;
        }

        // 使用XSS包装器
        XssHttpServletRequestWrapper xssRequest = new XssHttpServletRequestWrapper(request);
        
        // 设置安全响应头
        response.setHeader("X-XSS-Protection", "1; mode=block");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "SAMEORIGIN");
        response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");

        filterChain.doFilter(xssRequest, response);
    }

    @Override
    public void init(FilterConfig filterConfig) {
        logger.info("XssFilter 初始化完成");
    }

    @Override
    public void destroy() {
        logger.info("XssFilter 销毁");
    }
}
