package com.example.vnollxonlinejudge.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GoJudgeConfig {
    @Value("http://106.54.223.38:5050")
    private String goJudgeEndpoint;

    @Bean
    public String getGoJudgeEndpoint() {
        return goJudgeEndpoint;
    }

}