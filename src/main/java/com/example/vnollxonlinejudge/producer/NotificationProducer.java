package com.example.vnollxonlinejudge.producer;

import com.example.vnollxonlinejudge.model.entity.JudgeInfo;
import com.example.vnollxonlinejudge.model.entity.Notification;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class NotificationProducer {
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    public void sendNotification(Notification notification){
        try {
            String correlationId = UUID.randomUUID().toString();
            Message message = MessageBuilder
                    .withBody(objectMapper.writeValueAsBytes(notification))
                    .setReplyTo("replyQueue")
                    .setCorrelationId(correlationId)
                    .build();
            rabbitTemplate.send(
                    "notification",
                    "notification.send",
                    message
            );
        }catch (JsonProcessingException e) {
            throw new RuntimeException("消息序列化失败", e);
        }
    }
}
