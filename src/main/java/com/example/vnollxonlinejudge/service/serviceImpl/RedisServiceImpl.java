package com.example.vnollxonlinejudge.service.serviceImpl;


import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.service.RedisService;
import com.example.vnollxonlinejudge.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import jakarta.annotation.PostConstruct;
import redis.clients.jedis.params.SetParams;
import redis.clients.jedis.resps.Tuple;

import java.util.*;

import static com.example.vnollxonlinejudge.utils.GetScore.calculateScore;

@Service
@Setter
public class RedisServiceImpl implements RedisService {
    private static final Logger logger = LoggerFactory.getLogger(RedisService.class);
    private static final String SUBMISSION_QUEUE_KEY = "submission:queue";
    private static final String SUBMISSION_LOCK_KEY = "submission:lock";
    private static final int BATCH_SIZE = 50;
    @Autowired private JedisPool jedisPool;
    @Autowired private SubmissionService submissionService;

    @PostConstruct
    public void init() {
        new Thread(this::scheduledFlushTask).start();
    }
    @Scheduled(fixedRate = 5000)
    public void scheduledFlushTask() {
        flushSubmissionsToDB();
    }
    private void flushSubmissionsToDB() {
        String lockId = null;
        Jedis jedis = null;
        try {
            jedis = jedisPool.getResource();
            lockId = acquireLock(jedis, SUBMISSION_LOCK_KEY, 5000L);
            if (lockId == null) return ;
            long queueSize = jedis.llen(SUBMISSION_QUEUE_KEY);
            if (queueSize == 0) return ;
            // 批量获取待处理ID
            List<String> submissionIds = jedis.lrange(SUBMISSION_QUEUE_KEY, 0, BATCH_SIZE - 1);
            if (submissionIds == null || submissionIds.isEmpty()) return ;
            List<Submission> batchList = new ArrayList<>();
            for (String id : submissionIds) {
                Map<String, String> submissionMap = jedis.hgetAll(id);
                if (submissionMap.isEmpty()) continue;
                Submission sub = new Submission();
                sub.setUserName(submissionMap.get("userName"));
                sub.setUid(Long.valueOf(submissionMap.get("uid")));
                sub.setCid(Long.valueOf(submissionMap.get("cid")));
                sub.setPid(Long.valueOf(submissionMap.get("pid")));
                sub.setCreateTime(submissionMap.get("createTime"));
                sub.setLanguage(submissionMap.get("language"));
                sub.setTime(Long.parseLong(submissionMap.get("time")));
                sub.setMemory(Long.parseLong(submissionMap.get("memory")));
                sub.setProblemName(submissionMap.get("title"));
                sub.setStatus(submissionMap.get("status"));
                sub.setCode(submissionMap.get("code"));
                batchList.add(sub);
            }
            if (!batchList.isEmpty()) {
                submissionService.batchInsert(batchList);
                logger.info("批量写入{}条提交记录", batchList.size());
                // 删除已处理数据
                jedis.ltrim(SUBMISSION_QUEUE_KEY, batchList.size(), -1);
                submissionIds.forEach(jedis::del);
            }
        } catch (Exception e) {
            logger.error("批量写入异常", e);
        } finally {
            if (lockId != null && jedis != null) {
                releaseLock(jedis, SUBMISSION_LOCK_KEY, lockId);
            }
            if (jedis != null) {
                jedis.close();
            }
        }
    }
    @Override
    public void cacheSubmission(String userName, String title, String code,
                                String result, String createTime, String language,
                                Long uid, Long pid, Long time, Long memory,Long cid) {
        try (Jedis jedis = jedisPool.getResource()) {
            Map<String, String> submissionMap = new HashMap<>();
            submissionMap.put("userName", userName);
            submissionMap.put("title", title);
            submissionMap.put("code",code); // 大代码压缩
            submissionMap.put("status", result);
            submissionMap.put("createTime", createTime);
            submissionMap.put("language", language);
            submissionMap.put("uid", String.valueOf(uid));
            submissionMap.put("pid", String.valueOf(pid));
            submissionMap.put("time", String.valueOf(time));
            submissionMap.put("memory",String.valueOf(memory));
            submissionMap.put("cid", String.valueOf(cid));
            // 使用Redis Hash存储每条记录
            String submissionId = "sub:" + System.currentTimeMillis() + ":" + UUID.randomUUID();
            jedis.hmset(submissionId, submissionMap);

            // 将ID放入待处理队列
            jedis.lpush(SUBMISSION_QUEUE_KEY, submissionId);

            // 如果队列达到批量大小，立即触发处理
            if (jedis.llen(SUBMISSION_QUEUE_KEY) >= BATCH_SIZE) {
                flushSubmissionsToDB();
            }

        }
    }

    public String acquireLock(Jedis jedis, String lockKey, Long expireMs) {
        String identifier = UUID.randomUUID().toString();
        long end = System.currentTimeMillis() + expireMs;

        while (System.currentTimeMillis() < end) {
            if (jedis.setnx(lockKey, identifier) == 1) {
                jedis.pexpire(lockKey, expireMs);
                return identifier;
            }
            try {
                Thread.sleep(10);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        return null;
    }

    public void releaseLock(Jedis jedis, String lockKey, String identifier) {
        String currentValue = jedis.get(lockKey);
        if (identifier.equals(currentValue)) {
            jedis.del(lockKey);
        }
    }
    @Override
    public void setKey(String key, String value, Long seconds) {
        try (Jedis jedis = jedisPool.getResource()) {
            if (!jedis.exists(key)) {
                jedis.setex(key, seconds, value);
            }
        }
    }

    @Override
    public String getValueByKey(String key) {
        try (Jedis jedis = jedisPool.getResource()) {
            return jedis.get(key);
        }
    }

    @Override
    public boolean addToSetByKey(String key, Long score, String userName, Long seconds) {
        try (Jedis jedis = jedisPool.getResource()) {
            if (!jedis.exists(key)) {
                Long initialScore = calculateScore(0, 0);
                jedis.zadd(key, initialScore, userName);
                jedis.expire(key, seconds + 600);
                return true;
            }
        }
        return false;
    }

    @Override
    public void updateIfPass(String userPassKey, String userPenaltyKey, String problemPassKey, String problemSubmitKey, String rankingKey, String userName,Long penalty) {
        try (Jedis jedis = jedisPool.getResource()) {
            long passCount = jedis.incr(userPassKey);
            jedis.incr(problemPassKey);
            jedis.incr(problemSubmitKey);
            long newPenalty=jedis.incrBy(userPenaltyKey,penalty);
            Long newScore = calculateScore(Math.toIntExact(passCount), Math.toIntExact(newPenalty));
            jedis.zadd(rankingKey, newScore, userName);
        }
    }

    @Override
    public void updateIfNoPass(String userPenaltyKey, String problemSubmitKey, String userPassKey, String rankingKey, String userName) {
        try (Jedis jedis = jedisPool.getResource()) {
            long newPenalty = jedis.incrBy(userPenaltyKey, 20);
            jedis.incr(problemSubmitKey);
            int passCount = Integer.parseInt(jedis.get(userPassKey));
            Long newScore = calculateScore(passCount, Math.toIntExact(newPenalty));
            jedis.zadd(rankingKey, newScore, userName);
        }
    }

    @Override
    public Long getTtl(String key) {
        try (Jedis jedis = jedisPool.getResource()) {
            return jedis.ttl(key);
        }
    }

    @Override
    public List<Tuple> getZset(String key) {
        try (Jedis jedis = jedisPool.getResource()) {
            return jedis.zrangeWithScores(key, 0, -1);
        }
    }

    @Override
    public boolean IsExists(String key) {
        try (Jedis jedis = jedisPool.getResource()) {
            return jedis.exists(key);
        }
    }
    @Override
    public boolean tryLock(String lockKey,int expireTime) {
        String requestId = UUID.randomUUID().toString();
        try (Jedis jedis = jedisPool.getResource()) {
            SetParams setParams = SetParams.setParams().nx().px(expireTime);
            String result = jedis.set(lockKey, requestId, setParams);
            return "OK".equals(result);
        }
    }

    @Override
    public void deleteKey(String key) {
        try (Jedis jedis=jedisPool.getResource()){
            jedis.del(key);
        }
    }
}
