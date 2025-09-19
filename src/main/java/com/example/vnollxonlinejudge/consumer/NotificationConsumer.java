package com.example.vnollxonlinejudge.consumer;

import com.example.vnollxonlinejudge.model.entity.JudgeInfo;
import com.example.vnollxonlinejudge.model.entity.Notification;
import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class NotificationConsumer {
    private static final Logger logger = LoggerFactory.getLogger(NotificationConsumer.class);
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;
    @RabbitListener(queues = "notificationQueue")
    public void handleSubmission(Message message)  {

        try {
            Notification notification = objectMapper.readValue(
                    message.getBody(),
                    Notification.class
            );
            notificationService.sendNotification(notification,0L);

        } catch (IOException e) {
            logger.error("消息反序列化失败：",e);
            throw new RuntimeException("消息反序列化失败", e);
        }
    }
}
