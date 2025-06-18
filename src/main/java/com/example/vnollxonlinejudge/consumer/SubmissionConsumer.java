package com.example.vnollxonlinejudge.consumer;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.example.vnollxonlinejudge.domain.*;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.utils.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

import javax.annotation.PostConstruct;
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
    private ProblemMapper problemMapper;
    @Autowired
    private SubmissionMapper submissionMapper;
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private User_Solver_ProblemsMapper user_solver_problemsMapper;
    @Autowired
    private Competition_UsersMapper competition_usersMapper;
    @Autowired
    private RabbitTemplate rabbitTemplate;
    @Autowired
    private JedisPool jedisPool;
    private static final String SUBMISSION_QUEUE_KEY = "submission:queue";
    private static final String SUBMISSION_LOCK_KEY = "submission:lock";
    private static final int BATCH_SIZE = 50;
    private static final long FLUSH_INTERVAL = 5000;
    private static final String USER_PASS_COUNT_KEY = "competition_user_pass:%d:%s"; // cid:uid
    private static final String USER_PENALTY_KEY = "competition_user_penalty:%d:%s"; // cid:uid
    private static final String PROBLEM_PASS_KEY = "competition_problem_pass:%d:%d"; // cid:pid
    private static final String PROBLEM_SUBMIT_KEY = "competition_problem_submit:%d:%d"; // cid:pid
    private static final String RANKING_KEY = "competition_ranking:%d"; // cid
    private static final String TIME_OUT_KEY = "competition_time_out:%d"; // cid
    private static final String PROBLEM_INFO_KEY = "competition_problem_info:%d:%d"; // cid:pid
    @PostConstruct
    public void init() {
        // 启动定时刷写任务
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
    private void cacheSubmission(String userName, String title, String code,
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
    //新增方法：批量刷写到数据库（带分布式锁）
    private void flushSubmissionsToDB() {
        String lockId = null;
        Jedis jedis = null;

        try {
            jedis = jedisPool.getResource();
            lockId = acquireLock(jedis, SUBMISSION_LOCK_KEY, 5000);
            if (lockId == null) return;
            long queueSize = jedis.llen(SUBMISSION_QUEUE_KEY);
            if (queueSize == 0) return;
            // 批量获取待处理ID
            List<String> submissionIds = jedis.lrange(SUBMISSION_QUEUE_KEY, 0, BATCH_SIZE - 1);
            if (submissionIds == null || submissionIds.isEmpty()) return;
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
                sub.setCode(submissionMap.get("code").length() > 8192 ?
                        decompress(submissionMap.get("code")) : submissionMap.get("code"));
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

    // 压缩/解压方法
    private String compress(String str) throws IOException {
        if (str == null || str.length() == 0) return str;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (GZIPOutputStream gzip = new GZIPOutputStream(out)) {
            gzip.write(str.getBytes(StandardCharsets.UTF_8));
        }
        return Base64.getEncoder().encodeToString(out.toByteArray());
    }

    private String decompress(String compressedStr) throws IOException {
        if (compressedStr == null || compressedStr.length() == 0) return compressedStr;
        byte[] compressed = Base64.getDecoder().decode(compressedStr);
        ByteArrayInputStream in = new ByteArrayInputStream(compressed);
        try (GZIPInputStream gzip = new GZIPInputStream(in);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[1024];
            int len;
            while ((len = gzip.read(buffer)) > 0) {
                out.write(buffer, 0, len);
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
    @RabbitListener(queues = "submission.queue")
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
        long pid=submission.getPid();
        long uid=submission.getUid();
        long cid=submission.getCid();
        String userName=submission.getUserName();
        String problemName=submission.getProblemName();
        String code=submission.getCode();
        String option=submission.getLanguage();
        String create_time=submission.getCreateTime();
        Problem problem=null;
        User_Solved_Problems usp = user_solver_problemsMapper.judgeUserIsPass(pid, uid, cid);
        String userPassKey = null,userPenaltyKey=null,rankingKey=null,problemPassKey=null,problemSubmitKey=null,timeOutKey=null;
        if (cid != 0) {
            if (true){
            Jedis jedis=jedisPool.getResource();
            //System.out.println(jedis.get(String.format(TIME_OUT_KEY,2)));
                }
            timeOutKey=String.format(TIME_OUT_KEY,cid);
            userPassKey = String.format(USER_PASS_COUNT_KEY, cid, userName);
            userPenaltyKey = String.format(USER_PENALTY_KEY, cid, userName);
            rankingKey = String.format(RANKING_KEY, cid);
            problemPassKey = String.format(PROBLEM_PASS_KEY, cid, pid);
            problemSubmitKey = String.format(PROBLEM_SUBMIT_KEY, cid, pid);
            long ttlSeconds=0;
            try (Jedis jedis = jedisPool.getResource()) {
            String endTimeStr=jedis.get(timeOutKey);
            ttlSeconds=TimeUtils.calculateTTL(endTimeStr);
            if (!jedis.exists(userPassKey)) {
                jedis.setex(userPassKey, ttlSeconds + 600, "0");
            }
            if (!jedis.exists(userPenaltyKey)) {
                jedis.setex(userPenaltyKey, ttlSeconds + 600, "0");
            }
            if (!jedis.exists(rankingKey)) {
                competition_usersMapper.createRecord(cid, uid,userName);
                long initialScore = calculateScore(0, 0);
                jedis.zadd(rankingKey, initialScore, userName);
                jedis.expire(rankingKey, ttlSeconds + 600);
            }
            }catch (Exception e) {
                logger.error("Redis操作异常", e);
            }
        }
        if (cid == 0) problem = problemMapper.getProblemById(pid);
        else{
            try (Jedis jedis = jedisPool.getResource()) {
                String cacheKey = "competition:" + cid + ":problems";
                String problemsJson = jedis.get(cacheKey);
                TypeReference<Map<Integer, Problem>> typeRef = new TypeReference<Map<Integer, Problem>>() {
                };
                Map<Integer, Problem> problemMap = JSON.parseObject(problemsJson, typeRef);
                problem = problemMap.get((int) pid);
            }catch (Exception e) {
                logger.error("Redis操作异常", e);
            }
        }
        if (problem==null) {return "题目不存在或已被删除";}
        String str="";
        if(Objects.equals(option, "cpp17")){
            str= CplusplusJudge.Check(code,problem.getDatazip(),problem.getTimeLimit(),problem.getMemoryLimit());
        }else if(Objects.equals(option, "java")){
            str= JavaJudge.Check(code,problem.getDatazip(),problem.getTimeLimit(),problem.getMemoryLimit());
        }else if(Objects.equals(option, "python")){
            str= PythonJudge.Check(code,problem.getDatazip(),problem.getTimeLimit(),problem.getMemoryLimit());
        }
        if (str.contains("答案正确")) {
            if (usp == null) {
                user_solver_problemsMapper.createUserSolveProblem(uid, pid, cid);
                if (cid == 0) {
                    userMapper.updateSubmitCount(uid, 1);
                    problemMapper.updatePassCount(problem.getId(), 1);
                } else {
                    try (Jedis jedis = jedisPool.getResource()) {
                        long passCount = jedis.incr(userPassKey);
                        jedis.incr(problemPassKey);
                        jedis.incr(problemSubmitKey);
                        int penaltyTime = Integer.parseInt(jedis.get(userPenaltyKey));

                        long newScore = calculateScore((int) passCount, penaltyTime);
                        jedis.zadd(rankingKey, newScore, userName);
                    }catch (Exception e) {
                        logger.error("Redis操作异常", e);
                    }
                }
            }
        } else {
            if (cid == 0) {
                userMapper.updateSubmitCount(uid, 0);
                problemMapper.updatePassCount(problem.getId(), 0);
            } else if (usp == null) {
                try (Jedis jedis = jedisPool.getResource()) {
                    long newPenalty = jedis.incrBy(userPenaltyKey, 20);
                    jedis.incr(problemSubmitKey);
                    int passCount = Integer.parseInt(jedis.get(userPassKey));
                    long newScore = calculateScore(passCount, (int) newPenalty);
                    jedis.zadd(rankingKey, newScore, userName);
                }catch (Exception e) {
                    logger.error("Redis操作异常", e);
                }
            }
        }

        Pattern chinesePattern = Pattern.compile("[\\u4e00-\\u9fa5]+");
        Matcher chineseMatcher = chinesePattern.matcher(str);
        String chinese = "";
        if (chineseMatcher.find()) {
            chinese = chineseMatcher.group();
        }
        Pattern numberPattern = Pattern.compile("\\d+");
        Matcher numberMatcher = numberPattern.matcher(str);
        String number = "";
        if (numberMatcher.find()) {
            number = numberMatcher.group();
        }
        String language="";
        switch (option) {
            case "java":
                language = "Java";
                break;
            case "python":
                language = "Python";
                break;
            case "cpp17":
                language = "C++";
                break;
        }
        cacheSubmission(
                userName, problem.getTitle(), code, chinese,
                create_time, language, uid, pid,
                Integer.parseInt(number), cid
        );
        return chinese;
    }
    private long calculateScore(int passCount, int penaltyTime) {
        return ((long) (-passCount) << 32) | (penaltyTime & 0xFFFFFFFFL);
    }
}
