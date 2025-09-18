package com.example.vnollxonlinejudge.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GoJudgeConfig {
    @Value("http://go-judge:5050")
    private String goJudgeEndpoint;

    @Bean
    public String getGoJudgeEndpoint() {
        return goJudgeEndpoint;
    }

}