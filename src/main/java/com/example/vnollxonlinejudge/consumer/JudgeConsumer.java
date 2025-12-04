package com.example.vnollxonlinejudge.consumer;

import com.example.vnollxonlinejudge.judge.JudgeStrategy;
import com.example.vnollxonlinejudge.judge.JudgeStrategyFactory;
import com.example.vnollxonlinejudge.model.entity.*;
import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.service.SubmissionService;
import com.example.vnollxonlinejudge.websocket.JudgeWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;


@Component
public class JudgeConsumer {
    private static final Logger logger = LoggerFactory.getLogger(JudgeConsumer.class);
    private final ObjectMapper objectMapper;
    private final SubmissionService submissionService;
    private final JudgeStrategyFactory judgeStrategyFactory;
    private final JudgeWebSocketHandler judgeWebSocketHandler;

    @Autowired
    public JudgeConsumer(
            ObjectMapper objectMapper,
            SubmissionService submissionService,
            JudgeStrategyFactory judgeStrategyFactory,
            JudgeWebSocketHandler judgeWebSocketHandler
    ){
        this.objectMapper=objectMapper;
        this.submissionService=submissionService;
        this.judgeStrategyFactory=judgeStrategyFactory;
        this.judgeWebSocketHandler = judgeWebSocketHandler;
    }
    @RabbitListener(queues = "submissionQueue")
    public void handleSubmission(Message message)  {

        try {
            logger.info("Received message from judgeQueue");
            JudgeInfo judgeInfo = objectMapper.readValue(
                    message.getBody(),
                    JudgeInfo.class
            );
            logger.info("Processing submission: snowflakeId={}, uid={}", judgeInfo.getSnowflakeId(), judgeInfo.getUid());

            JudgeStrategy strategy = judgeStrategyFactory.getStrategy(judgeInfo.getLanguage());
            //submissionService.updateSubmissionJudgeStatusBySnowflake(judgeInfo.getSnowflakeId(),"评测中",null,null);
            sendUpdate(judgeInfo, "评测中", null, null, null);


            RunResult result=strategy.judge(
                    judgeInfo.getCode(),
                    judgeInfo.getPid() + ".zip",
                    judgeInfo.getTime(),
                    judgeInfo.getMemory()
            );
            submissionService.updateSubmissionJudgeStatusBySnowflake(judgeInfo.getSnowflakeId(),result.getStatus(), result.getRunTime(),result.getMemory());
            
            // 获取错误信息（如果有）
            String errorInfo = null;
            if (result.getFiles() != null && result.getFiles().getStderr() != null) {
                errorInfo = result.getFiles().getStderr();
            }
            sendUpdate(judgeInfo, result.getStatus(), result.getRunTime(), result.getMemory(), errorInfo);

        } catch (IOException e) {
            logger.error("消息反序列化失败：",e);
            throw new RuntimeException("消息反序列化失败", e);
        }
    }

    private void sendUpdate(JudgeInfo judgeInfo, String status, Long time, Long memory, String errorInfo) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("snowflakeId", String.valueOf(judgeInfo.getSnowflakeId())); // Ensure it's a string for JS
            data.put("status", status);
            data.put("time", time);
            data.put("memory", memory);
            data.put("errorInfo", errorInfo); // 添加错误信息

            String json = objectMapper.writeValueAsString(data);
            judgeWebSocketHandler.sendMessageToUser(judgeInfo.getUid(), json);
        } catch (Exception e) {
            logger.error("Failed to send WebSocket update", e);
        }
    }
}
