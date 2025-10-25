package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.submission.SubmissionVo;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.SubmissionMapper;
import com.example.vnollxonlinejudge.service.*;
import com.example.vnollxonlinejudge.utils.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

import static com.example.vnollxonlinejudge.utils.GetScore.calculateScore;

@Service
public class SubmissionServiceImpl extends ServiceImpl<SubmissionMapper,Submission> implements SubmissionService {
    private static final Logger logger = LoggerFactory.getLogger(SubmissionService.class);
    private final ProblemService problemService;
    private final RedisService redisService;
    private final UserService userService;
    private final CompetitionUserService competitionUserService;

    private final UserTagService userTagService;
    private final ProblemTagService problemTagService;

    @Autowired
    public SubmissionServiceImpl(
            @Lazy ProblemService problemService,
            @Lazy RedisService redisService,
            UserService userService,
            CompetitionUserService competitionUserService,
            UserTagService userTagService,
            ProblemTagService problemTagService
    ) {
        this.problemService = problemService;
        this.redisService=redisService;
        this.userService=userService;
        this.competitionUserService=competitionUserService;
        this.userTagService=userTagService;
        this.problemTagService=problemTagService;
    }

    private static final String USER_PASS_COUNT_KEY = "competition_user_pass:%d:%s"; // cid:uid
    private static final String USER_PENALTY_KEY = "competition_user_penalty:%d:%s"; // cid:uid
    private static final String PROBLEM_PASS_KEY = "competition_problem_pass:%d:%d"; // cid:pid
    private static final String PROBLEM_SUBMIT_KEY = "competition_problem_submit:%d:%d"; // cid:pid
    private static final String RANKING_KEY = "competition_ranking:%d"; // cid
    private static final String TIME_OUT_KEY = "competition_time_out:%d"; // cid
    private static final String TIME_BEGIN_KEY="competition_time_begin:%d";

    public SubmissionVo getSubmissionById(Long id){
            Submission submission = this.getById(id);
            if (submission == null) {
                throw  new BusinessException("提交记录不存在");
            }
            return new SubmissionVo(submission);
    }

    @Override
    public void processSubmission(Submission submission) {
        //初始化所有键和信息！！！
        Long pid=submission.getPid();
        Long uid=submission.getUid();
        Long cid=submission.getCid();
        String userName=submission.getUserName();
        String code=submission.getCode();
        String option=submission.getLanguage();
        String createTime=submission.getCreateTime();
        ProblemVo problem=null;
        String userPassKey = null,userPenaltyKey=null,rankingKey=null,problemPassKey=null,problemSubmitKey=null,timeOutKey=null,timeBeginKey=null;
        if (cid != 0) {
            timeOutKey=String.format(TIME_OUT_KEY,cid);
            timeBeginKey=String.format(TIME_BEGIN_KEY,cid);
            userPassKey = String.format(USER_PASS_COUNT_KEY, cid, userName);
            userPenaltyKey = String.format(USER_PENALTY_KEY, cid, userName);
            rankingKey = String.format(RANKING_KEY, cid);
            problemPassKey = String.format(PROBLEM_PASS_KEY, cid, pid);
            problemSubmitKey = String.format(PROBLEM_SUBMIT_KEY, cid, pid);
            String endTimeStr=redisService.getValueByKey(timeOutKey);
            Long ttlSeconds= TimeUtils.calculateTTL(endTimeStr);
            redisService.setKey(userPassKey,"0",ttlSeconds+600);
            redisService.setKey(userPenaltyKey,"0",ttlSeconds+600);
            if (redisService.addToSetByKey(rankingKey,calculateScore(0L,0L),userName,ttlSeconds+600)){
                competitionUserService.createRecord(cid,uid,userName);
            }

        }
        //初始化所有键和信息！！！
        //获取题目信息！！！！
        if (cid == 0) problem = problemService.getProblemInfo(pid,0L,null);
        else{
            //String cacheKey = "competition:" + cid + ":problems";
            String problemsJson = redisService.getValueByKey("competition:" + cid + ":problems");
            TypeReference<Map<Long, ProblemVo>> typeRef = new TypeReference<Map<Long, ProblemVo>>() {
            };
            Map<Long, ProblemVo> problemMap = JSON.parseObject(problemsJson, typeRef);
            problem = problemMap.get(pid);
        }
        //获取题目信息！！！！
        boolean ok=problemService.isSolved(pid,uid,cid);
        //提交后对题目提交数，用户提交数进行处理！！！！
        if (submission.getStatus().equals("答案正确")) { //如果问题通过
            if (!ok) { //是否首次通过
                List<String> tagList=problemTagService.getTagNames(problem.getId());
                userTagService.updateTagPassStatus(uid,tagList,1L);
                System.out.println(problem.getTitle());
                for (String tag:tagList){
                    System.out.println(tag);
                }
                problemService.addUserSolveRecord(pid,uid,cid,problem.getTitle()); //对问题添加通过记录
                if (cid == 0) { //如果非比赛
                    userService.updateSubmitCount(uid,1);//用户通过数加一，用户自己不太可能同时提交多次，所以无需加锁
                    problemService.updatePassCount(pid,1);//题目通过数也加一
                } else {
                    String beginTimeStr=redisService.getValueByKey(timeBeginKey);
                    Long penalty= TimeUtils.calculateMin(beginTimeStr,createTime);
                    redisService.updateIfPass(userPassKey,userPenaltyKey,problemPassKey,problemSubmitKey,rankingKey,userName,penalty);//如果是比赛那就需要更新缓存了
                }
            }
        } else {//未通过
            if (!ok){
                List<String> tagList=problemTagService.getTagNames(problem.getId());
                userTagService.updateTagPassStatus(uid,tagList,1L);
            }
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
                createTime, language, uid, pid,
                submission.getTime(), submission.getMemory(),cid
        );
    }

    @Override
    @Transactional
    public void batchInsert(List<Submission> submissions) {
        saveBatch(submissions);
    }

    @Override
    public void deleteSubmissionsByPid(Long pid) {
        QueryWrapper<Submission>wrapper=new QueryWrapper<>();
        wrapper.eq("pid",pid);
        this.baseMapper.delete(wrapper);
    }

    @Override
    public List<SubmissionVo> getSubmissionList(
            Long cid, Long uid, String language,
            String status, String keyword,
            int pageNum, int pageSize
    ) {
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
        if (StringUtils.isNotBlank(keyword)) {
            wrapper.and(w -> w.like("user_name", keyword)
                    .or()
                    .like("problem_name", keyword));
        }
        wrapper.orderByDesc("id");
        Page<Submission> result = this.page(page, wrapper);
        return result.getRecords().stream()
                .map(SubmissionVo::new)
                .collect(Collectors.toList());
    }

    @Override
    public Long getCount(Long cid, Long uid, String language, String status,String keyword) {
        QueryWrapper<Submission> wrapper=new QueryWrapper<>();
        if (cid!=0){
            wrapper.eq("cid",cid);
        }
        if (uid!=null&&uid!=0){
            wrapper.eq("uid",uid);
        }
        if (StringUtils.isNotBlank(language)){
            wrapper.eq("language",language);
        }
        if (StringUtils.isNotBlank(status)){
            wrapper.eq("status",status);
        }
        if (StringUtils.isNotBlank(keyword)) {
            wrapper.and(w -> w.like("user_name", keyword)
                    .or()
                    .like("problem_name", keyword));
        }
        return this.count(wrapper);
    }

    @Override
    public void deleteSubmissionsByCid(Long cid) {
        QueryWrapper<Submission> wrapper=new QueryWrapper<>();
        wrapper.eq("cid",cid);
        this.baseMapper.delete(wrapper);
    }
}
