package com.example.vnollxonlinejudge.producer;


import com.example.vnollxonlinejudge.domain.JudgeInfo;
import com.example.vnollxonlinejudge.domain.Submission;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;

import java.util.UUID;

@Service
public class SubmissionProducer {

    @Autowired
    private RabbitTemplate rabbitTemplate;
    @Autowired
    private ObjectMapper objectMapper;
    public String sendSubmission(int priority, JudgeInfo judgeInfo){
        try {
            String correlationId = UUID.randomUUID().toString();
            Message message = MessageBuilder
                    .withBody(objectMapper.writeValueAsBytes(judgeInfo))
                    .setPriority(priority)
                    .setReplyTo("replyQueue")
                    .setCorrelationId(correlationId)
                    .build();
            Message responseMessage = rabbitTemplate.sendAndReceive(
                    "judge",
                    "judge.submit",
                    message
            );
            if (responseMessage == null) {
                throw new RuntimeException("等待响应超时");
            }
            return new String(responseMessage.getBody());
        }catch (JsonProcessingException e) {
            throw new RuntimeException("消息序列化失败", e);
        }
    }
}