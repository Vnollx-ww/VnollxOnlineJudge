package com.example.vnollxonlinejudge.producer;

import com.example.vnollxonlinejudge.model.entity.JudgeInfo;
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
    /**
     * 发送评测消息。
     * <p>
     * 队列位置（"前方还有 N 位"）由调用方在入库前基于 DB 统计得到，与本方法无关——
     * MQ 只能给出总深度，无法定位具体一条消息的位置；此外 DB 计数与列表懒计算的口径一致，
     * 能保证提交响应、列表刷新、单条详情三处显示完全统一。
     */
    public void sendJudge(int priority, JudgeInfo judgeInfo) {
        String correlationId = UUID.randomUUID().toString();
        try {
            byte[] messageBody = objectMapper.writeValueAsBytes(judgeInfo);

            Message message = MessageBuilder
                    .withBody(messageBody)
                    .setPriority(priority)
                    .setCorrelationId(correlationId)
                    .build();

            rabbitTemplate.send("judge", "judge.submit", message);

            logger.debug("消息发送成功, correlationId: {}", correlationId);

        } catch (JsonProcessingException e) {
            logger.error("消息序列化失败: judgeInfo={}", judgeInfo, e);
            throw new RuntimeException("消息序列化失败: " + e.getMessage(), e);

        } catch (AmqpException e) {
            logger.error("消息发送到RabbitMQ失败: 交换机=judge, 路由键=judge.submit, 消息Id={}",
                    correlationId, e);
            throw new RuntimeException("消息发送失败: " + e.getMessage(), e);
        }
    }
}