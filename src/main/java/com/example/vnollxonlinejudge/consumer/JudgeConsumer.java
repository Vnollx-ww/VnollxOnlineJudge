package com.example.vnollxonlinejudge.consumer;

import com.example.vnollxonlinejudge.judge.AgentSubmitRequest;
import com.example.vnollxonlinejudge.judge.JudgeAgentClient;
import com.example.vnollxonlinejudge.judge.JudgeStatusDescriber;
import com.example.vnollxonlinejudge.model.entity.*;
import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.service.ProblemService;
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
    private final JudgeAgentClient judgeAgentClient;
    private final JudgeWebSocketHandler judgeWebSocketHandler;
    private final ProblemService problemService;

    @Autowired
    public JudgeConsumer(
            ObjectMapper objectMapper,
            SubmissionService submissionService,
            JudgeAgentClient judgeAgentClient,
            JudgeWebSocketHandler judgeWebSocketHandler,
            ProblemService problemService
    ){
        this.objectMapper=objectMapper;
        this.submissionService=submissionService;
        this.judgeAgentClient=judgeAgentClient;
        this.judgeWebSocketHandler = judgeWebSocketHandler;
        this.problemService = problemService;
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

            Problem problem = problemService.getById(judgeInfo.getPid());
            submissionService.updateSubmissionJudgeStatusBySnowflake(judgeInfo.getSnowflakeId(), "评测中", null, null, null, null, null);
            sendUpdate(judgeInfo, "评测中", null, null, null, null, null);

            AgentSubmitRequest req = new AgentSubmitRequest();
            req.setSubmissionId(judgeInfo.getSnowflakeId());
            req.setProblemId(judgeInfo.getPid());
            req.setLanguage(judgeInfo.getLanguage());
            req.setCode(judgeInfo.getCode());
            req.setTimeLimit(judgeInfo.getTime());
            req.setMemoryLimit(judgeInfo.getMemory());
            if (problem != null) {
                req.setJudgeMode(problem.getJudgeMode());
                req.setCheckerFile(problem.getCheckerFile());
                req.setFloatTolerance(problem.getFloatTolerance());
                Integer version = problem.getVersion();
                req.setDataVersion(version != null ? String.valueOf(version) : "1");
            } else {
                req.setDataVersion("1");
            }
            RunResult result = judgeAgentClient.submit(req);
            // 获取错误信息（如果有）
            String errorInfo = null;
            if (result.getFiles() != null && result.getFiles().getStderr() != null) {
                errorInfo = result.getFiles().getStderr();
            }
            boolean competition = judgeInfo.getCid() != null && judgeInfo.getCid() != 0;
            String storedError = competition ? null : errorInfo;
            Integer storedPass = competition ? null : result.getPassCount();
            Integer storedTest = competition ? null : result.getTestCount();
            submissionService.updateSubmissionJudgeStatusBySnowflake(
                    judgeInfo.getSnowflakeId(),
                    result.getStatus(),
                    result.getRunTime(),
                    result.getMemory(),
                    storedError,
                    storedPass,
                    storedTest
            );
            submissionService.processSubmission(judgeInfo,result.getStatus());
            sendUpdate(judgeInfo, result.getStatus(), result.getRunTime(), result.getMemory(), storedError, storedPass, storedTest);
            logger.info("评测完成: snowflakeId={}", judgeInfo.getSnowflakeId());

        } catch (IOException e) {
            logger.error("消息反序列化失败：",e);
            throw new RuntimeException("消息反序列化失败", e);
        }
    }

    private void sendUpdate(JudgeInfo judgeInfo, String status, Long time, Long memory, String errorInfo, Integer passCount, Integer testCount) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("snowflakeId", String.valueOf(judgeInfo.getSnowflakeId())); // Ensure it's a string for JS
            data.put("status", status);
            data.put("description", JudgeStatusDescriber.describe(status, "submit"));
            data.put("time", time);
            data.put("memory", memory);
            data.put("errorInfo", errorInfo);
            data.put("passCount", passCount);
            data.put("testCount", testCount);

            String json = objectMapper.writeValueAsString(data);
            judgeWebSocketHandler.sendMessageToUser(judgeInfo.getUid(), json);
        } catch (Exception e) {
            logger.error("Failed to send WebSocket update", e);
        }
    }
}
