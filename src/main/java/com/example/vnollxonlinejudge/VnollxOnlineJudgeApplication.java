package com.example.vnollxonlinejudge;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.web.servlet.ServletComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ServletComponentScan
@EnableScheduling
@EnableRabbit // 添加此注解
@MapperScan("com.example.vnollxonlinejudge.mapper")

public class VnollxOnlineJudgeApplication {

    public static void main(String[] args) {
        SpringApplication.run(VnollxOnlineJudgeApplication.class, args);
    }

}
