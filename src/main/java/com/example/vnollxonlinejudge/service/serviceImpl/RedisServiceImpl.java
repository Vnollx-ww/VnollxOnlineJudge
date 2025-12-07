package com.example.vnollxonlinejudge.service.serviceImpl;


import com.example.vnollxonlinejudge.service.RedisService;
import com.example.vnollxonlinejudge.utils.GetScore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
public class RedisServiceImpl implements RedisService {
    private static final Logger logger = LoggerFactory.getLogger(RedisService.class);
    private final RedisTemplate<String, Object> redisTemplate;
    private final StringRedisTemplate stringRedisTemplate;

    @Autowired
    public RedisServiceImpl(RedisTemplate<String, Object> redisTemplate,
                            StringRedisTemplate stringRedisTemplate) {
        this.redisTemplate = redisTemplate;
        this.stringRedisTemplate = stringRedisTemplate;
    }
    @Override
    public void setKey(String key, String value, Long seconds) {
        try {
            if (Boolean.FALSE.equals(stringRedisTemplate.hasKey(key))) {
                stringRedisTemplate.opsForValue().set(key, value, seconds, TimeUnit.SECONDS);
            }
        } catch (Exception e) {
            logger.error("设置键值异常", e);
        }
    }

    @Override
    public String getValueByKey(String key) {
        try {
            return stringRedisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            logger.error("获取键值异常", e);
            return null;
        }
    }

    @Override
    public Boolean checkKeyValue(String key, String value) {
        try {
            if (Boolean.FALSE.equals(stringRedisTemplate.hasKey(key))) {
                return false;
            }
            String storedValue = stringRedisTemplate.opsForValue().get(key);
            return value.equals(storedValue);
        } catch (Exception e) {
            logger.error("检查键值异常", e);
            return false;
        }
    }

    @Override
    public boolean addToSetByKey(String key, Long score, String userName, Long seconds) {
        try {
            if (Boolean.FALSE.equals(stringRedisTemplate.hasKey(key))) {
                Long initialScore = GetScore.calculateScore(0L, 0L);
                redisTemplate.opsForZSet().add(key, userName, initialScore);
                redisTemplate.expire(key, seconds + 600, TimeUnit.SECONDS);
                return true;
            }
        } catch (Exception e) {
            logger.error("添加到有序集合异常", e);
        }
        return false;
    }

    @Override
    public void updateIfPass(String userPassKey, String userPenaltyKey, String problemPassKey, String problemSubmitKey, String rankingKey, String userName,Long penalty) {
        try {
            Long passCount = stringRedisTemplate.opsForValue().increment(userPassKey);
            stringRedisTemplate.opsForValue().increment(problemPassKey);
            stringRedisTemplate.opsForValue().increment(problemSubmitKey);
            Long newPenalty = stringRedisTemplate.opsForValue().increment(userPenaltyKey, penalty);
            Long newScore = GetScore.calculateScore(passCount, newPenalty);
            redisTemplate.opsForZSet().add(rankingKey, userName, newScore);
        } catch (Exception e) {
            logger.error("更新通过状态异常", e);
        }
    }

    @Override
    public void updateIfNoPass(String userPenaltyKey, String problemSubmitKey, String userPassKey, String rankingKey, String userName) {
        try {
            Long newPenalty = stringRedisTemplate.opsForValue().increment(userPenaltyKey, 20);
            stringRedisTemplate.opsForValue().increment(problemSubmitKey);
            String passCountStr = stringRedisTemplate.opsForValue().get(userPassKey);
            Long passCount = passCountStr != null ? Integer.parseInt(passCountStr) : 0L;
            Long newScore = GetScore.calculateScore(passCount, newPenalty);
            redisTemplate.opsForZSet().add(rankingKey, userName, newScore);
        } catch (Exception e) {
            logger.error("更新未通过状态异常", e);
        }
    }

    @Override
    public Long getTtl(String key) {
        try {
            return stringRedisTemplate.getExpire(key, TimeUnit.SECONDS);
        } catch (Exception e) {
            logger.error("获取TTL异常", e);
            return -1L;
        }
    }

    @Override
    public Set<ZSetOperations.TypedTuple<String>> getZset(String key) {
        try {
            Set<ZSetOperations.TypedTuple<Object>> rawTuples = redisTemplate.opsForZSet().rangeWithScores(key, 0, -1);
            Set<ZSetOperations.TypedTuple<String>> result = new HashSet<>();
            if (rawTuples != null) {
                for (ZSetOperations.TypedTuple<Object> tuple : rawTuples) {
                    if (tuple.getValue() instanceof String) {
                        result.add(ZSetOperations.TypedTuple.of((String) tuple.getValue(), tuple.getScore()));
                    }
                }
            }
            return result;
        } catch (Exception e) {
            logger.error("获取有序集合异常", e);
            return new HashSet<>();
        }
    }

    @Override
    public boolean IsExists(String key) {
        try {
            return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));
        } catch (Exception e) {
            logger.error("检查键是否存在异常", e);
            return false;
        }
    }

    @Override
    public boolean tryLock(String lockKey, int expireTime) {
        String requestId = UUID.randomUUID().toString();
        try {
            Boolean success = stringRedisTemplate.opsForValue().setIfAbsent(lockKey, requestId, expireTime, TimeUnit.MILLISECONDS);
            return Boolean.TRUE.equals(success);
        } catch (Exception e) {
            logger.error("尝试获取锁异常", e);
            return false;
        }
    }

    @Override
    public void deleteKey(String key) {
        try {
            stringRedisTemplate.delete(key);
        } catch (Exception e) {
            logger.error("删除键异常", e);
        }
    }

    @Override
    public Long getTTL(String key) {
        return stringRedisTemplate.getExpire(key, TimeUnit.SECONDS);
    }
}
