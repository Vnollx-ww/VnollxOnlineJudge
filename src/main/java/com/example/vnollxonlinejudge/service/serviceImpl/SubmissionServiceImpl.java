package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.dto.response.problem.ProblemResponse;
import com.example.vnollxonlinejudge.model.dto.response.submission.SubmissionResponse;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.SubmissionMapper;
import com.example.vnollxonlinejudge.service.*;
import com.example.vnollxonlinejudge.utils.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

import static com.example.vnollxonlinejudge.utils.GetScore.calculateScore;

@Service
public class SubmissionServiceImpl extends ServiceImpl<SubmissionMapper,Submission> implements SubmissionService {
    private static final Logger logger = LoggerFactory.getLogger(SubmissionService.class);
    @Autowired
    private ProblemService problemService;
    @Autowired
    private RedisService redisService;
    @Autowired
    private UserService userService;
    @Autowired
    private CompetitionUserService competitionUserService;
    private static final String USER_PASS_COUNT_KEY = "competition_user_pass:%d:%s"; // cid:uid
    private static final String USER_PENALTY_KEY = "competition_user_penalty:%d:%s"; // cid:uid
    private static final String PROBLEM_PASS_KEY = "competition_problem_pass:%d:%d"; // cid:pid
    private static final String PROBLEM_SUBMIT_KEY = "competition_problem_submit:%d:%d"; // cid:pid
    private static final String RANKING_KEY = "competition_ranking:%d"; // cid
    private static final String TIME_OUT_KEY = "competition_time_out:%d"; // cid

    public SubmissionResponse getSubmissionById(long id){
            Submission submission = this.getById(id);
            if (submission == null) {
                throw  new BusinessException("提交记录不存在");
            }
            return new SubmissionResponse(submission);
    }

    @Override
    public void processSubmission(Submission submission) {
        //初始化所有键和信息！！！
        long pid=submission.getPid();
        long uid=submission.getUid();
        long cid=submission.getCid();
        String userName=submission.getUserName();
        String code=submission.getCode();
        String option=submission.getLanguage();
        String create_time=submission.getCreateTime();
        ProblemResponse problem=null;
        String userPassKey = null,userPenaltyKey=null,rankingKey=null,problemPassKey=null,problemSubmitKey=null,timeOutKey=null;
        if (cid != 0) {
            timeOutKey=String.format(TIME_OUT_KEY,cid);
            userPassKey = String.format(USER_PASS_COUNT_KEY, cid, userName);
            userPenaltyKey = String.format(USER_PENALTY_KEY, cid, userName);
            rankingKey = String.format(RANKING_KEY, cid);
            problemPassKey = String.format(PROBLEM_PASS_KEY, cid, pid);
            problemSubmitKey = String.format(PROBLEM_SUBMIT_KEY, cid, pid);
            String endTimeStr=redisService.getValueByKey(timeOutKey);
            long ttlSeconds= TimeUtils.calculateTTL(endTimeStr);
            redisService.setkey(userPassKey,"0",ttlSeconds+600);
            redisService.setkey(userPenaltyKey,"0",ttlSeconds+600);
            if (redisService.addToSetByKey(rankingKey,calculateScore(0,0),userName,ttlSeconds+600)){
                competitionUserService.createRecord(cid,uid,userName);
            }

        }
        //初始化所有键和信息！！！
        //获取题目信息！！！！
        if (cid == 0) problem = problemService.getProblemInfo(pid,0);
        else{
            //String cacheKey = "competition:" + cid + ":problems";
            String problemsJson = redisService.getValueByKey("competition:" + cid + ":problems");
            TypeReference<Map<Integer, ProblemResponse>> typeRef = new TypeReference<Map<Integer, ProblemResponse>>() {
            };
            Map<Integer, ProblemResponse> problemMap = JSON.parseObject(problemsJson, typeRef);
            problem = problemMap.get((int) pid);
        }
        //获取题目信息！！！！
        boolean ok=problemService.judgeIsSolve(pid,uid,cid);
        //提交后对题目提交数，用户提交数进行处理！！！！
        if (submission.getStatus().equals("答案正确")) { //如果问题通过
            if (!ok) { //是否首次通过
                problemService.addUserSolveRecord(pid,uid,cid); //对问题添加通过记录
                if (cid == 0) { //如果非比赛
                    userService.updateSubmitCount(uid,1);//用户通过数加一，用户自己不太可能同时提交多次，所以无需加锁
                    problemService.updatePassCount(pid,1);//题目通过数也加一
                } else {
                    redisService.updateIfPass(userPassKey,userPenaltyKey,problemPassKey,problemSubmitKey,rankingKey,userName);//如果是比赛那就需要更新缓存了
                }
            }
        } else {//未通过
            if (cid == 0) {
                userService.updateSubmitCount(uid,0);//如果非比赛，提交总数加1
                problemService.updatePassCount(pid,0);//问题提交数也加一
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
                userName, problem.getTitle(), code, submission.getStatus(),
                create_time, language, uid, pid,
                submission.getTime(), cid
        );
    }

    @Override
    public void batchInsert(List<Submission> submissions) {
        baseMapper.batchInsert(submissions);
    }

    @Override
    public void deleteSubmissionsByPid(long pid) {
        QueryWrapper<Submission>wrapper=new QueryWrapper<>();
        wrapper.eq("pid",pid);
        this.baseMapper.delete(wrapper);
    }

    @Override
    public List<SubmissionResponse> getSubmissionList(long cid, long uid, String language, String status, int pageNum, int pageSize) {
        Page<Submission> page = new Page<>(pageNum, pageSize);
        QueryWrapper<Submission> wrapper=new QueryWrapper<>();
        if (cid!=0){
            wrapper.eq("cid",cid);
        }
        if (uid!=0){
            wrapper.eq("uid",uid);
        }
        if (StringUtils.isNotBlank(language)){
            wrapper.eq("language",language);
        }
        if (StringUtils.isNotBlank(status)){
            wrapper.eq("status",status);
        }
        wrapper.orderByDesc("id");
        Page<Submission> result = this.page(page, wrapper);
        return result.getRecords().stream()
                .map(SubmissionResponse::new)
                .collect(Collectors.toList());
    }

    @Override
    public long getCount(long cid, long uid, String language, String status) {
        QueryWrapper<Submission> wrapper=new QueryWrapper<>();
        if (cid!=0){
            wrapper.eq("cid",cid);
        }
        if (uid!=0){
            wrapper.eq("uid",uid);
        }
        if (StringUtils.isNotBlank(language)){
            wrapper.eq("language",language);
        }
        if (StringUtils.isNotBlank(status)){
            wrapper.eq("status",status);
        }
        return this.count(wrapper);
    }
}
