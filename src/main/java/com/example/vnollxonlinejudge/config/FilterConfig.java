package com.example.vnollxonlinejudge.config;

import com.example.vnollxonlinejudge.filter.TokenFilter;
import com.example.vnollxonlinejudge.filter.XssFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FilterConfig {

    @Bean
    public FilterRegistrationBean<XssFilter> xssFilterRegistration(XssFilter filter) {
        FilterRegistrationBean<XssFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(filter);
        registration.addUrlPatterns("/*");
        registration.setOrder(0);
        return registration;
    }
    
    @Bean
    public FilterRegistrationBean<TokenFilter> tokenFilterRegistration(TokenFilter filter) {
        FilterRegistrationBean<TokenFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(filter);
        registration.addUrlPatterns("/api/v1/user/*", "/api/v1/problem/*", "/api/v1/submission/*", "/api/v1/solve/*",
                "/api/v1/competition/*", "/api/v1/judge/*", "/api/v1/admin/*", "/api/v1/tag/*",
                "/api/v1/notification/*", "/api/v1/comment/*", "/api/v1/ai/*", "/api/v1/practice/*", "/api/v1/friend/*");
        registration.setOrder(1);
        return registration;
    }
}