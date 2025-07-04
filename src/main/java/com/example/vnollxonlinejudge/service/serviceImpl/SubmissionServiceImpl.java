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
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.example.vnollxonlinejudge.utils.CalculateScore.calculateScore;

@Service
public class SubmissionServiceImpl implements SubmissionService {
    private static final Logger logger = LoggerFactory.getLogger(ProblemService.class);
    @Autowired
    private SubmissionMapper submissionMapper;
    //// 使用 setter 注入代替构造器注入
    @Autowired
    private ProblemService problemService;
    @Autowired
    private RedisService redisService;
    //// 使用 setter 注入代替构造器注入
    @Autowired
    private UserService userService;
    @Autowired
    private CompetitionService competitionService;
    @Autowired
    private LockManager lockManager;
    @Autowired
    private JudgeService judgeService;
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
        //初始化所有键和信息！！！
        long pid=submission.getPid();
        long uid=submission.getUid();
        long cid=submission.getCid();
        String userName=submission.getUserName();
        String code=submission.getCode();
        String option=submission.getLanguage();
        String create_time=submission.getCreateTime();
        Problem problem=null;
        boolean ok=problemService.judgeIsSolve(pid,uid,cid);
        String userPassKey = null,userPenaltyKey=null,rankingKey=null,problemPassKey=null,problemSubmitKey=null,timeOutKey=null;
        if (cid != 0) {
            timeOutKey=String.format(TIME_OUT_KEY,cid);
            userPassKey = String.format(USER_PASS_COUNT_KEY, cid, userName);
            userPenaltyKey = String.format(USER_PENALTY_KEY, cid, userName);
            rankingKey = String.format(RANKING_KEY, cid);
            problemPassKey = String.format(PROBLEM_PASS_KEY, cid, pid);
            problemSubmitKey = String.format(PROBLEM_SUBMIT_KEY, cid, pid);
            String endTimeStr=redisService.getValueByKey(timeOutKey);
            long ttlSeconds= TimeUtils.calculateTTL(endTimeStr);;
            redisService.setkey(userPassKey,"0",ttlSeconds+600);
            redisService.setkey(userPenaltyKey,"0",ttlSeconds+600);
            if (redisService.addToSetByKey(rankingKey,calculateScore(0,0),userName,ttlSeconds+600)){
                competitionService.addUserRecord(cid,uid,userName);
            }

        }
        //初始化所有键和信息！！！


        //获取题目信息！！！！
        if (cid == 0) problem = (Problem) problemService.getProblemInfo(pid,0).getData();
        else{
            //String cacheKey = "competition:" + cid + ":problems";
            StringBuffer cacheKey=new StringBuffer();
            cacheKey.append("competition:").append(cid).append(":problems");
            String problemsJson = redisService.getValueByKey(cacheKey.toString());
            TypeReference<Map<Integer, Problem>> typeRef = new TypeReference<Map<Integer, Problem>>() {
            };
            Map<Integer, Problem> problemMap = JSON.parseObject(problemsJson, typeRef);
            problem = problemMap.get((int) pid);
        }
        if (problem==null) {return "题目不存在或已被删除";}
        //获取题目信息！！！！

        //提交后对题目提交数，用户提交数进行处理！！！！
        RunResult res=judgeService.judge(problem,code,option);
        if (res.getStatus().equals("答案正确")) { //如果问题通过
            if (!ok) { //是否首次通过
                problemService.addUserSolveRecord(pid,uid,cid); //对问题添加通过记录
                if (cid == 0) { //如果非比赛
                    userService.updateSubmitCount(uid,1);//用户通过数加一，用户自己不太可能同时提交多次，所以无需加锁
                    Object lock = lockManager.getLock(pid);
                    synchronized (lock) {
                        problemService.updatePassCount(pid,1);//题目通过数也加一
                    }
                } else {
                    redisService.updateIfPass(userPassKey,userPenaltyKey,problemPassKey,problemSubmitKey,rankingKey,userName);//如果是比赛那就需要更新缓存了
                }
            }
        } else {//未通过
            if (cid == 0) {
                userService.updateSubmitCount(uid,0);//如果非比赛，提交总数加一
                Object lock = lockManager.getLock(pid);
                synchronized (lock) {
                    problemService.updatePassCount(pid,0);//问题提交数也加一
                }
            } else if (!ok) {
                redisService.updateIfNoPass(userPenaltyKey,problemSubmitKey,userPassKey,rankingKey,userName);//是比赛，而且之前也没通过，那就需要罚时了
            }
        }
        //提交后对题目提交数，用户提交数进行处理！！！！

        //提交记录写入缓存，缓存定期同步数据库！！！！
        String language="";
        if(Objects.equals(option, "java"))language="Java";
        else if(Objects.equals(option, "python"))language="Python";
        else language="C++";
        redisService.cacheSubmission(
                userName, problem.getTitle(), code, res.getStatus(),
                create_time, language, uid, pid,
                (int)res.getRunTime(), cid
        );
        return res.getStatus();
    }

    @Override
    public void batchInsert(List<Submission> submissions) {
        submissionMapper.batchInsert(submissions);
    }
}
