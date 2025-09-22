package com.example.vnollxonlinejudge.consumer;

import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.model.entity.*;
import com.example.vnollxonlinejudge.service.SubmissionService;
import com.example.vnollxonlinejudge.judge.JudgeStrategy;
import com.example.vnollxonlinejudge.judge.JudgeStrategyFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.io.IOException;


@Component
@RequiredArgsConstructor
public class SubmissionConsumer {
    private static final Logger logger = LoggerFactory.getLogger(SubmissionConsumer.class);
    private final ObjectMapper objectMapper;
    private final SubmissionService submissionService;
    @RabbitListener(queues = "submissionQueue")
    public void handleSubmission(Message message)  {

        try {
            Submission submission = objectMapper.readValue(
                    message.getBody(),
                    Submission.class
            );
            submissionService.processSubmission(submission);
        } catch (IOException e) {
            logger.error("消息反序列化失败：",e);
            throw new RuntimeException("消息反序列化失败", e);
        }
    }
}
