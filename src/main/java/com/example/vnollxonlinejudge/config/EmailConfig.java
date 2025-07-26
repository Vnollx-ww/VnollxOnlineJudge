package com.example.vnollxonlinejudge.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;


@Getter
@Configuration
public class EmailConfig {
    @Value("smtp.qq.com")
    private String hostName;
    @Value("465")
    private int smtpPost;
    @Value("2720741614@qq.com")
    private String userName;
    @Value("jfccwlsdynqfdchg")
    private String password;


}
