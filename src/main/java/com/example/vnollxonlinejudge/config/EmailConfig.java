package com.example.vnollxonlinejudge.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;


@Getter
@Configuration
public class EmailConfig {
    @Value("${spring.mail.host}")
    private String hostName;
    @Value("${spring.mail.port}")
    private int smtpPost;
    @Value("${spring.mail.username}")
    private String userName;
    @Value("${spring.mail.password}")
    private String password;
}
