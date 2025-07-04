package com.example.vnollxonlinejudge.consumer;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.example.vnollxonlinejudge.domain.*;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.SubmissionService;
import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.utils.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

@Service
public class SubmissionConsumer {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private RabbitTemplate rabbitTemplate;
    @Autowired
    private SubmissionService submissionService;

    @RabbitListener(queues = "submissionQueue")
    public void handleSubmission(Message message)  {

        try {
            Submission submission = objectMapper.readValue(
                    message.getBody(),
                    Submission.class
            );
            String result = processSubmission(submission);
            String replyTo = message.getMessageProperties().getReplyTo();
            String correlationId = message.getMessageProperties().getCorrelationId();
            Message response = MessageBuilder
                    .withBody(result.getBytes())
                    .setCorrelationId(correlationId)
                    .build();
            rabbitTemplate.send("", replyTo, response);
        } catch (IOException e) {
            throw new RuntimeException("消息反序列化失败", e);
        }
    }
    private String processSubmission(Submission submission) {
       return submissionService.processSubmission(submission);
    }
}
