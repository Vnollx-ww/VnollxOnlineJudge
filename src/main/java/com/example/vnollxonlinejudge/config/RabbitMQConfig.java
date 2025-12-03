package com.example.vnollxonlinejudge.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class RabbitMQConfig {

    @Value("${spring.rabbitmq.template.reply-timeout:10000}")
    private int replyTimeout;

    // 队列定义
    @Bean
    public Queue judgeQueue_v1() {
        Map<String, Object> queueArgs = new HashMap<>();
        queueArgs.put("x-max-priority", 10);
        return new Queue("judgeQueue_v1", true, false, false, queueArgs);
    }

    @Bean
    public Queue notificationQueue() {
        return new Queue("notificationQueue", true);
    }

    @Bean
    public Queue replyQueue() {
        return new Queue("replyQueue", true);
    }

    // 交换器定义
    @Bean
    public DirectExchange judgeExchange() {
        return new DirectExchange("judge");
    }

    @Bean
    public DirectExchange notificationExchange() {
        return new DirectExchange("notification");
    }

    // 绑定
    @Bean
    public Binding judgeBinding() {
        return BindingBuilder.bind(judgeQueue_v1())
                .to(judgeExchange())
                .with("judge.submit");
    }

    @Bean
    public Binding notificationBinding() {
        return BindingBuilder.bind(notificationQueue())
                .to(notificationExchange())
                .with("notification.send");
    }

    // 只需要配置自定义的部分
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        template.setReplyTimeout(replyTimeout);
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter());
        factory.setPrefetchCount(1);
        return factory;
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}