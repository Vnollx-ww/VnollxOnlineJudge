package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.domain.Submission;
import com.example.vnollxonlinejudge.mapper.SubmissionMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

import javax.annotation.PostConstruct;
import java.util.*;
@Service
public class RedisService {
    private static final Logger logger = LoggerFactory.getLogger(ProblemService.class);
    private static final String SUBMISSION_QUEUE_KEY = "submission:queue";
    private static final String SUBMISSION_LOCK_KEY = "submission:lock";
    private static final int BATCH_SIZE = 50;
    private static final long FLUSH_INTERVAL = 5000;
    @Autowired
    private JedisPool jedisPool;
    @Autowired
    private SubmissionMapper submissionMapper;
    @PostConstruct
    public void init() {
        new Thread(this::scheduledFlushTask).start();
    }
    private void scheduledFlushTask() {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                Thread.sleep(FLUSH_INTERVAL);
                flushSubmissionsToDB();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logger.warn("刷写线程被中断", e);
            }
        }
    }
    public void cacheSubmission(String userName, String title, String code,
                                            String result, String createTime, String language,
                                            long uid, long pid, int time, long cid) {
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
    private void flushSubmissionsToDB() {
        String lockId = null;
        Jedis jedis = null;

        try {
            jedis = jedisPool.getResource();
            lockId = acquireLock(jedis, SUBMISSION_LOCK_KEY, 5000);
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
                sub.setTime(Integer.parseInt(submissionMap.get("time")));
                sub.setProblemName(submissionMap.get("title"));
                sub.setStatus(submissionMap.get("status"));
                sub.setCode(submissionMap.get("code"));
                // 设置其他字段...
                batchList.add(sub);
            }
            if (!batchList.isEmpty()) {
                submissionMapper.batchInsert(batchList);
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
        return ;
    }
    // 分布式锁工具方法
    private String acquireLock(Jedis jedis, String lockKey, long expireMs) {
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

    private void releaseLock(Jedis jedis, String lockKey, String identifier) {
        String currentValue = jedis.get(lockKey);
        if (identifier.equals(currentValue)) {
            jedis.del(lockKey);
        }
    }
}
