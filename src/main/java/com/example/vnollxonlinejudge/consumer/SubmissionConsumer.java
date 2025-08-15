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
    private final RabbitTemplate rabbitTemplate;
    private final SubmissionService submissionService;
    private final JudgeStrategyFactory judgeStrategyFactory;
    @RabbitListener(queues = "submissionQueue")
    public void handleSubmission(Message message)  {

        try {
            JudgeInfo judgeInfo = objectMapper.readValue(
                    message.getBody(),
                    JudgeInfo.class
            );
            RunResult result = processSubmission(judgeInfo);
            // 异步处理提交记录
            asyncProcessSubmission(
                    judgeInfo,result.getStatus(),
                    result.getRunTime(),
                    result.getMemory()
            );
            //进行回调
            String replyTo = message.getMessageProperties().getReplyTo();
            String correlationId = message.getMessageProperties().getCorrelationId();
            Message response = MessageBuilder
                    .withBody(result.getStatus().getBytes())
                    .setCorrelationId(correlationId)
                    .build();
            rabbitTemplate.send("", replyTo, response);
        } catch (IOException e) {
            logger.error("消息反序列化失败：",e);
            throw new RuntimeException("消息反序列化失败", e);
        }
    }
    private RunResult processSubmission(JudgeInfo judgeInfo) {
        JudgeStrategy strategy = judgeStrategyFactory.getStrategy(judgeInfo.getLanguage());
        return strategy.judge(
                judgeInfo.getCode(),
                judgeInfo.getPid() + ".zip",
                judgeInfo.getTime(),
                judgeInfo.getMemory()
        );
    }
    @Async
    public void asyncProcessSubmission(JudgeInfo judgeInfo,String status,Long runTime,Long runMemory) {
        Submission submission = new Submission(
                judgeInfo.getCode(),
                judgeInfo.getLanguage(),
                judgeInfo.getPid(),
                judgeInfo.getCid(),
                judgeInfo.getUid(),
                judgeInfo.getCreateTime(),
                judgeInfo.getUname(),
                status,
                runTime,
                runMemory
        );
        submissionService.processSubmission(submission);
    }
}
