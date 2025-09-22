package com.example.vnollxonlinejudge.config;

import com.example.vnollxonlinejudge.filter.TokenFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FilterConfig {
    
    @Bean
    public FilterRegistrationBean<TokenFilter> tokenFilterRegistration(TokenFilter filter) {
        FilterRegistrationBean<TokenFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(filter);
        registration.addUrlPatterns("/user/*", "/problem/*", "/submission/*", "/solve/*",
                "/competition/*", "/judge/*", "/admin/*", "/tag/*",
                "/notification/*", "/comment/*");
        registration.setOrder(1);
        return registration;
    }
}