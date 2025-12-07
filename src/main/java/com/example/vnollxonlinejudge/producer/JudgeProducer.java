package com.example.vnollxonlinejudge.producer;

import com.example.vnollxonlinejudge.model.entity.JudgeInfo;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;

import java.util.UUID;

@Service
public class JudgeProducer {
    private static final Logger logger = LoggerFactory.getLogger(JudgeProducer.class);
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    @Autowired
    public JudgeProducer(
            RabbitTemplate rabbitTemplate,
            ObjectMapper objectMapper
    ){
        this.rabbitTemplate=rabbitTemplate;
        this.objectMapper=objectMapper;
    }
    public void sendJudge(int priority, JudgeInfo judgeInfo){
        String correlationId = UUID.randomUUID().toString();
        try {
            // 1. 序列化消息（可能抛出 JsonProcessingException）
            byte[] messageBody = objectMapper.writeValueAsBytes(judgeInfo);

            // 2. 构建消息
            Message message = MessageBuilder
                    .withBody(messageBody)
                    .setPriority(priority)
                    .setCorrelationId(correlationId)
                    .build();

            // 3. 发送消息（可能抛出 AmqpException 等）
            rabbitTemplate.send("judge", "judge.submit", message);

            logger.debug("消息发送成功, correlationId: {}",
                    correlationId);

        } catch (JsonProcessingException e) {
            // 序列化失败
            logger.error("消息序列化失败: judgeInfo={}", judgeInfo, e);
            throw new RuntimeException("消息序列化失败: " + e.getMessage(), e);

        } catch (AmqpException e) {
            // RabbitMQ 发送异常
            logger.error("消息发送到RabbitMQ失败: 交换机=judge, 路由键=judge.submit, 消息Id={}",
                    correlationId, e);
            throw new RuntimeException("消息发送失败: " + e.getMessage(), e);
        }

    }
}