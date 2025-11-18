package com.example.vnollxonlinejudge.service.serviceImpl;


import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.service.RedisService;
import com.example.vnollxonlinejudge.service.SubmissionService;
import com.example.vnollxonlinejudge.utils.GetScore;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
public class RedisServiceImpl implements RedisService {
    private static final Logger logger = LoggerFactory.getLogger(RedisService.class);
    private static final String SUBMISSION_QUEUE_KEY = "submission:queue";
    private static final String SUBMISSION_LOCK_KEY = "submission:lock";
    private static final int BATCH_SIZE = 50;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisTemplate<String, String> stringRedisTemplateForList;
    private final StringRedisTemplate stringRedisTemplate;
    private final SubmissionService submissionService;

    @Autowired
    public RedisServiceImpl(@Lazy SubmissionService submissionService,
                            RedisTemplate<String, Object> redisTemplate,
                            RedisTemplate<String, String> stringRedisTemplateForList,
                            StringRedisTemplate stringRedisTemplate) {
        this.submissionService = submissionService;
        this.redisTemplate = redisTemplate;
        this.stringRedisTemplateForList = stringRedisTemplateForList;
        this.stringRedisTemplate = stringRedisTemplate;
    }
    @Scheduled(fixedDelay = 10000, initialDelay = 30000)
    public void scheduledFlushTask() {
        flushSubmissionsToDB();
    }
    private void flushSubmissionsToDB() {
        try {
            Long queueSize = stringRedisTemplateForList.opsForList().size(SUBMISSION_QUEUE_KEY);
            if (queueSize == null || queueSize == 0) {
                return;
            }

            // 批量获取待处理ID
            List<String> submissionIds = stringRedisTemplateForList.opsForList().range(SUBMISSION_QUEUE_KEY, 0, BATCH_SIZE - 1);
            if (submissionIds == null || submissionIds.isEmpty()) return;

            List<Submission> batchList = new ArrayList<>();
            for (String id : submissionIds) {
                Map<Object, Object> submissionMap = redisTemplate.opsForHash().entries(id);
                if (submissionMap.isEmpty()) continue;

                Submission sub = Submission.builder()
                        .code(cleanString((String) submissionMap.get("code")))
                        .language(cleanString((String) submissionMap.get("language")))
                        .pid(parseLong(cleanString((String) submissionMap.get("pid"))))
                        .cid(parseLong(cleanString((String) submissionMap.get("cid"))))
                        .uid(parseLong(cleanString((String) submissionMap.get("uid"))))
                        .createTime(cleanString((String) submissionMap.get("createTime")))
                        .userName(cleanString((String) submissionMap.get("userName")))
                        .status(cleanString((String) submissionMap.get("status")))
                        .time(parseLong(cleanString((String) submissionMap.get("time"))))
                        .memory(parseLong(cleanString((String) submissionMap.get("memory"))))
                        .problemName(cleanString((String) submissionMap.get("title")))
                        .build();
                batchList.add(sub);
            }

            if (!batchList.isEmpty()) {
                submissionService.batchInsert(batchList);
                logger.info("批量写入{}条提交记录", batchList.size());
                // 删除已处理数据
                stringRedisTemplateForList.opsForList().trim(SUBMISSION_QUEUE_KEY, batchList.size(), -1);
                submissionIds.forEach(redisTemplate::delete);
            }
        } catch (Exception e) {
            logger.error("批量写入异常", e);
        }
    }
    @Override
    public void cacheSubmission(String userName, String title, String code,
                                String result, String createTime, String language,
                                Long uid, Long pid, Long time, Long memory,Long cid) {
        try {
            Map<String, String> submissionMap = new HashMap<>();
            submissionMap.put("userName", userName);
            submissionMap.put("title", title);
            submissionMap.put("code", code); // 大代码压缩
            submissionMap.put("status", result);
            submissionMap.put("createTime", createTime);
            submissionMap.put("language", language);
            submissionMap.put("uid", String.valueOf(uid));
            submissionMap.put("pid", String.valueOf(pid));
            submissionMap.put("time", String.valueOf(time));
            submissionMap.put("memory", String.valueOf(memory));
            submissionMap.put("cid", String.valueOf(cid));

            // 使用Redis Hash存储每条记录
            String submissionId = "sub:" + System.currentTimeMillis() + ":" + UUID.randomUUID();
            redisTemplate.opsForHash().putAll(submissionId, submissionMap);

            // 将ID放入待处理队列
            stringRedisTemplateForList.opsForList().leftPush(SUBMISSION_QUEUE_KEY, submissionId);

            // 如果队列达到批量大小，立即触发处理
            Long queueSize = stringRedisTemplateForList.opsForList().size(SUBMISSION_QUEUE_KEY);
            if (queueSize != null && queueSize >= BATCH_SIZE) {
                flushSubmissionsToDB();
            }
        } catch (Exception e) {
            logger.error("缓存提交记录异常", e);
        }
    }


    public void releaseLock(String lockKey, String identifier) {
        try {
            String currentValue = stringRedisTemplate.opsForValue().get(lockKey);
            if (identifier.equals(currentValue)) {
                stringRedisTemplate.delete(lockKey);
                logger.debug("成功释放分布式锁: {}", identifier);
            } else {
                logger.warn("锁标识不匹配，无法释放锁。期望: {}, 实际: {}", identifier, currentValue);
            }
        } catch (Exception e) {
            logger.error("释放分布式锁异常: {}", identifier, e);
        }
    }
    @Override
    public void setKey(String key, String value, Long seconds) {
        try {
            if (!stringRedisTemplate.hasKey(key)) {
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
            if (!stringRedisTemplate.hasKey(key)) {
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
            if (!stringRedisTemplate.hasKey(key)) {
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
            return stringRedisTemplate.hasKey(key);
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

    /**
     * 清理字符串，移除多余的引号
     */
    private String cleanString(String str) {
        if (str == null) return null;
        // 移除首尾的引号
        if (str.startsWith("\"") && str.endsWith("\"")) {
            return str.substring(1, str.length() - 1);
        }
        return str;
    }

    /**
     * 安全解析Long值
     */
    private Long parseLong(String str) {
        if (str == null || str.trim().isEmpty()) return 0L;
        try {
            return Long.parseLong(cleanString(str));
        } catch (NumberFormatException e) {
            logger.warn("无法解析数字: {}", str, e);
            return 0L;
        }
    }
}
