package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.domain.Submission;
import com.example.vnollxonlinejudge.mapper.SubmissionMapper;
import com.example.vnollxonlinejudge.service.*;
import com.example.vnollxonlinejudge.utils.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.cache.CacheProperties;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

import javax.annotation.PostConstruct;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.example.vnollxonlinejudge.utils.CalculateScore.calculateScore;

@Service
public class SubmissionServiceImpl implements SubmissionService {
    private static final Logger logger = LoggerFactory.getLogger(ProblemService.class);
    @Autowired
    private SubmissionMapper submissionMapper;
    @Autowired
    private ProblemService problemService;
    @Autowired
    private UserService userService;
    @Autowired
    private JedisPool jedisPool;
    @Autowired
    private CompetitionService competitionService;
    @Autowired
    private LockManager lockManager;
    @Autowired
    private JudgeService judgeService;
    @Autowired
    private RedisService redisService;
    private static final String USER_PASS_COUNT_KEY = "competition_user_pass:%d:%s"; // cid:uid
    private static final String USER_PENALTY_KEY = "competition_user_penalty:%d:%s"; // cid:uid
    private static final String PROBLEM_PASS_KEY = "competition_problem_pass:%d:%d"; // cid:pid
    private static final String PROBLEM_SUBMIT_KEY = "competition_problem_submit:%d:%d"; // cid:pid
    private static final String RANKING_KEY = "competition_ranking:%d"; // cid
    private static final String TIME_OUT_KEY = "competition_time_out:%d"; // cid


    @Override
    public Result createSubmission(String code,String user_name,String product_name, String status, String create_time, String language,long uid,long pid, int time,long cid) {
        try {
            submissionMapper.addSubmission(user_name,product_name,code,status,create_time,language,uid,pid,time,cid);
            return Result.Success("添加记录成功");
        } catch (Exception e) {
            logger.error("添加记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getSubmission(int offset, int size) {
        try {
            List<Submission> submissions=submissionMapper.getSubmission(offset,size);
            return Result.Success(submissions,"获取提交记录成功");
        }catch (Exception e){
            logger.error("查询提交记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getSubmissionByUid(long uid,int offset, int size) {
        try {
            List<Submission> submissions=submissionMapper.getSubmissionByUid(uid,offset,size);
            return Result.Success(submissions,"获取提交记录成功");
        }catch (Exception e){
            logger.error("查询提交记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    public Result getSubmissionById(long id){
        try {
            Submission submission=submissionMapper.getSubmissionById(id);
            if (submission==null){
                return Result.LogicError("提交记录不存在");
            }
            return Result.Success(submission,"获取提交记录成功");
        }catch (Exception e){
            logger.error("查询提交记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @Override
    public Result getSubmissionCount(long uid){
        try {
            int count=submissionMapper.getSubmissionCount(uid);
            return Result.Success(count,"获取提交记录数量成功");
        }catch (Exception e){
            logger.error("查询提交记录数量失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getSubmissionCountByCid(long cid) {
        try {
            int count=submissionMapper.getSubmissionCountByCid(cid);
            return Result.Success(count,"获取提交记录数量成功");
        }catch (Exception e){
            logger.error("查询提交记录数量失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getSubmissionByCid(long cid,int offset,int size) {
        try {
            List<Submission> submissions=submissionMapper.getSubmissionByCid(cid,offset,size);
            return Result.Success(submissions,"获取提交记录成功");
        }catch (Exception e){
            logger.error("查询提交记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getAllSubmissionCount(){
        try {
            int count=submissionMapper.getAllSubmissionCount();
            return Result.Success(count,"获取提交记录数量成功");
        }catch (Exception e){
            logger.error("查询提交记录数量失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getSubmissionByStatusAndLanguage(String status, String language, int offset, int size) {
        try{
        List<Submission> submissions=submissionMapper.getSubmissionByStatusAndLanguage(status,language,offset,size);
        return Result.Success(submissions,"获取提交记录成功");
        }catch (Exception e) {
            logger.error("查询提交记录失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getCountByStatusAndLanguage(String status, String language) {
        try {
            int count = submissionMapper.getCountByStatusAndLanguage(status, language);
            return Result.Success(count, "获取提交记录数量成功");
        }catch (Exception e) {
            logger.error("查询提交记录数量失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public String processSubmission(Submission submission) {
        long pid=submission.getPid();
        long uid=submission.getUid();
        long cid=submission.getCid();
        String userName=submission.getUserName();
        String code=submission.getCode();
        String option=submission.getLanguage();
        String create_time=submission.getCreateTime();
        Problem problem=null;
        Result result=problemService.judgeIsSolve(pid,uid,cid);
        String userPassKey = null,userPenaltyKey=null,rankingKey=null,problemPassKey=null,problemSubmitKey=null,timeOutKey=null;
        if (cid != 0) {
            timeOutKey=String.format(TIME_OUT_KEY,cid);
            userPassKey = String.format(USER_PASS_COUNT_KEY, cid, userName);
            userPenaltyKey = String.format(USER_PENALTY_KEY, cid, userName);
            rankingKey = String.format(RANKING_KEY, cid);
            problemPassKey = String.format(PROBLEM_PASS_KEY, cid, pid);
            problemSubmitKey = String.format(PROBLEM_SUBMIT_KEY, cid, pid);
            long ttlSeconds=0;
            try (Jedis jedis = jedisPool.getResource()) {
                String endTimeStr=jedis.get(timeOutKey);
                ttlSeconds= TimeUtils.calculateTTL(endTimeStr);
                if (!jedis.exists(userPassKey)) {
                    jedis.setex(userPassKey, ttlSeconds + 600, "0");
                }
                if (!jedis.exists(userPenaltyKey)) {
                    jedis.setex(userPenaltyKey, ttlSeconds + 600, "0");
                }
                if (!jedis.exists(rankingKey)) {
                    competitionService.addUserRecord(cid,uid,userName);
                    long initialScore = calculateScore(0, 0);
                    jedis.zadd(rankingKey, initialScore, userName);
                    jedis.expire(rankingKey, ttlSeconds + 600);
                }
            }catch (Exception e) {
                logger.error("Redis操作异常", e);
            }
        }
        if (cid == 0) problem = (Problem) problemService.getProblemInfo(pid,0).getData();
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
        String str=judgeService.judge(problem,code,option);
        if (str.contains("答案正确")) {
            if (result.getData() == "false") {
                problemService.addUserSolveRecord(pid,uid,cid);
                if (cid == 0) {
                    userService.updateSubmitCount(uid,1);
                    Object lock = lockManager.getLock(pid);
                    synchronized (lock) {
                        problemService.updatePassCount(pid,1);
                    }
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
                userService.updateSubmitCount(uid,0);
                Object lock = lockManager.getLock(pid);
                synchronized (lock) {
                    problemService.updatePassCount(pid,0);
                }
            } else if (result.getData() == "false") {
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
        if(Objects.equals(option, "java"))language="Java";
        else if(Objects.equals(option, "python"))language="Python";
        else language="C++";
        redisService.cacheSubmission(
                userName, problem.getTitle(), code, chinese,
                create_time, language, uid, pid,
                Integer.parseInt(number), cid
        );

        return chinese;
    }
}
