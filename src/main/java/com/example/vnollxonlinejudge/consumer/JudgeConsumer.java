package com.example.vnollxonlinejudge.consumer;

import com.example.vnollxonlinejudge.judge.JudgeStrategy;
import com.example.vnollxonlinejudge.judge.JudgeStrategyFactory;
import com.example.vnollxonlinejudge.model.entity.*;
import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.service.SubmissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;


@Component
public class JudgeConsumer {
    private static final Logger logger = LoggerFactory.getLogger(JudgeConsumer.class);
    private final ObjectMapper objectMapper;
    private final SubmissionService submissionService;
    private final JudgeStrategyFactory judgeStrategyFactory;
    @Autowired
    public JudgeConsumer(
            ObjectMapper objectMapper,
            SubmissionService submissionService,
            JudgeStrategyFactory judgeStrategyFactory
    ){
        this.objectMapper=objectMapper;
        this.submissionService=submissionService;
        this.judgeStrategyFactory=judgeStrategyFactory;
    }
    @RabbitListener(queues = "judgeQueue")
    public void handleSubmission(Message message)  {

        try {
            JudgeInfo judgeInfo = objectMapper.readValue(
                    message.getBody(),
                    JudgeInfo.class
            );
            JudgeStrategy strategy = judgeStrategyFactory.getStrategy(judgeInfo.getLanguage());

            submissionService.updateSubmissionJudgeStatusBySnowflake(judgeInfo.getSnowflakeId(),"评测中",null,null);


            RunResult result=strategy.judge(
                    judgeInfo.getCode(),
                    judgeInfo.getPid() + ".zip",
                    judgeInfo.getTime(),
                    judgeInfo.getMemory()
            );
            submissionService.updateSubmissionJudgeStatusBySnowflake(judgeInfo.getSnowflakeId(),result.getStatus(), result.getRunTime(),result.getMemory());
        } catch (IOException e) {
            logger.error("消息反序列化失败：",e);
            throw new RuntimeException("消息反序列化失败", e);
        }
    }
}
