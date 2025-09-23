package com.example.vnollxonlinejudge.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web 配置类
 * 处理静态资源映射和路径配置
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 处理 Chrome DevTools 相关的请求
        registry.addResourceHandler("/.well-known/**")
                .addResourceLocations("classpath:/static/.well-known/")
                .setCachePeriod(3600);
        
        // 处理 favicon.ico 请求
        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(3600);
        
        // 处理其他静态资源
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(3600);
    }
}
