package com.example.vnollxonlinejudge.config;

import com.example.vnollxonlinejudge.redis.listener.CompetitionExpirationListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;

@Configuration
public class RedisConfig {

    // Redis 服务器配置
    private final String HOST = "localhost";
    private final int PORT = 6379;
    private final int TIMEOUT = 2000;

    // 连接池配置参数
    private final int MAX_TOTAL = 100;
    private final int MAX_IDLE = 10;
    private final int MIN_IDLE = 5;
    private final boolean TEST_ON_BORROW = true;
    private final boolean TEST_ON_RETURN = true;

    @Bean
    public JedisPoolConfig jedisPoolConfig() {
        JedisPoolConfig config = new JedisPoolConfig();
        config.setMaxTotal(MAX_TOTAL);
        config.setMaxIdle(MAX_IDLE);
        config.setMinIdle(MIN_IDLE);
        config.setTestOnBorrow(TEST_ON_BORROW);
        config.setTestOnReturn(TEST_ON_RETURN);
        config.setJmxEnabled(false); // 禁用 JMX
        return config;
    }

    @Bean
    public JedisPool jedisPool(JedisPoolConfig jedisPoolConfig) {
        return new JedisPool(jedisPoolConfig, HOST, PORT, TIMEOUT);
    }
    public Jedis getJedis(JedisPool jedisPool) {
        return jedisPool.getResource();
    }
    public void close(Jedis jedis) {
        if (jedis != null) {
            jedis.close();
        }
    }
    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        return container;
    }

    @Bean
    public CompetitionExpirationListener competitionExpirationListener(RedisMessageListenerContainer container) {
        return new CompetitionExpirationListener(container);
    }
}