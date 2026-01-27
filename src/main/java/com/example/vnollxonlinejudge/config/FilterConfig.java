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
        registration.addUrlPatterns("/user/*", "/problem/*", "/submission/*", "/solve/*",
                "/competition/*", "/judge/*", "/admin/*", "/tag/*",
                "/notification/*", "/comment/*","/ai/*","/practice/*","/friend/*");
        registration.setOrder(1);
        return registration;
    }
}