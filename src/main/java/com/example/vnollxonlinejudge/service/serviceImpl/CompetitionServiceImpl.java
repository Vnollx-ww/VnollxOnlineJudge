package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import com.example.vnollxonlinejudge.model.entity.*;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.service.*;
import com.example.vnollxonlinejudge.utils.TimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.redis.core.ZSetOperations;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CompetitionServiceImpl extends ServiceImpl<CompetitionMapper, Competition> implements CompetitionService {
    private static final Logger logger = LoggerFactory.getLogger(CompetitionService.class);
    private final CompetitionUserService competitionUserService;
    private final CompetitionProblemService competitionProblemService;
    private final ProblemService problemService;
    private final RedisService redisService;
    private final UserSolvedProblemService userSolvedProblemService;
    private final SubmissionService submissionService;

    @Autowired
    public CompetitionServiceImpl(
            @Lazy CompetitionUserService competitionUserService,
            CompetitionProblemService competitionProblemService,
            ProblemService problemService,
            RedisService redisService,
            UserSolvedProblemService userSolvedProblemService,
            SubmissionService submissionService
    ) {
        this.competitionUserService=competitionUserService;
        this.competitionProblemService=competitionProblemService;
        this.problemService=problemService;
        this.redisService=redisService;
        this.userSolvedProblemService=userSolvedProblemService;
        this.submissionService=submissionService;
    }
    private static final String PROBLEM_PASS_KEY = "competition_problem_pass:%d:%d"; // cid:pid
    private static final String PROBLEM_SUBMIT_KEY = "competition_problem_submit:%d:%d"; // cid:pid
    private static final String USER_PASS_COUNT_KEY = "competition_user_pass:%d:%s"; // cid:uid
    private static final String USER_PENALTY_KEY = "competition_user_penalty:%d:%s"; // cid:uid
    private static final String TIME_OUT_KEY = "competition_time_out:%d"; // cid
    private static final String TIME_BEGIN_KEY="competition_time_begin:%d";
    private static final String RANKING_KEY = "competition_ranking:%d"; // cid
    @Override
    public CompetitionVo getCompetitionById(Long id) {
        Competition competition = this.baseMapper.selectById(id);
        if (competition == null) {
            throw new BusinessException("比赛不存在");
        }
        return new CompetitionVo(competition);
    }
    @Override
    public void createCompetition(String title, String description, String beginTime, String endTime, String password,boolean needPassword) {
        Competition competition = new Competition();
        competition.setTitle(title);
        competition.setDescription(description);
        competition.setBeginTime(beginTime);
        competition.setEndTime(endTime);
        competition.setPassword(password);
        competition.setNeedPassword(needPassword);;

        this.save(competition);
    }

    @Override
    public void updateCompetition(Long id, String title, String description, String beginTime, String endTime, String password, boolean needPassword) {
        Competition competition=this.getById(id);
        if (competition==null){
            throw new BusinessException("比赛不存在或已被删除");
        }
        competition.setTitle(title);
        competition.setDescription(description);
        competition.setBeginTime(beginTime);
        competition.setEndTime(endTime);
        competition.setPassword(password);
        competition.setNeedPassword(needPassword);
        this.updateById(competition);
    }

    @Override
    public List<CompetitionVo> getCompetitionList(int pageNum, int pageSize, String keyword) {
        QueryWrapper<Competition> wrapper=new QueryWrapper<>();
        List<Competition> competitionList;
        if (StringUtils.isNotBlank(keyword)){
            wrapper.like("title",keyword);
            Page<Competition> page = new Page<>(pageNum, pageSize);
            competitionList=this.page(page, wrapper).getRecords();
        }
        else{
            if (pageNum==0){
                competitionList = this.list(wrapper);
                competitionList.forEach(competition -> competition.setPassword("*******"));
            }
            else{
                Page<Competition> page = new Page<>(pageNum, pageSize);
                competitionList=this.page(page, wrapper).getRecords();
            }
        }
        return competitionList.stream()
                .map(CompetitionVo::new)
                .collect(Collectors.toList());
    }

    @Override
    public Long getCount(String keyword) {
        QueryWrapper<Competition>wrapper=new QueryWrapper<>();
        wrapper.like("title",keyword);
        return this.count(wrapper);
    }

    @Override
    public void confirmPassword(Long id,String password) {
        Competition competition = this.getById(id);
        if (competition == null) {
            throw new BusinessException("比赛不存在");
        }
        if (!Objects.equals(competition.getPassword(), password)) {
            throw new BusinessException("密码错误");
        }
    }

    @Override
    public List<ProblemVo> getProblemList(Long cid) {
            String cacheKey = "competition:" + cid + ":problems";
            String problemsJson = redisService.getValueByKey(cacheKey);
            String timeOutKey = String.format(TIME_OUT_KEY, cid);
            List<ProblemVo> problems = new ArrayList<>();
            if (problemsJson != null&&redisService.getTtl(cacheKey)>600) {
                TypeReference<Map<Integer, ProblemVo>> typeRef = new TypeReference<Map<Integer, ProblemVo>>() {};
                Map<Integer, ProblemVo> problemMap = JSON.parseObject(problemsJson, typeRef);
                // 设置提交和通过次数
                for (ProblemVo p : problemMap.values()) {
                    String passKey = String.format(PROBLEM_PASS_KEY, cid, p.getId());
                    String submitKey = String.format(PROBLEM_SUBMIT_KEY, cid, p.getId()); // 假设存在提交次数的key
                    // 获取并设置通过次数和提交次数（增加空值处理）
                    String passCount = redisService.getValueByKey(passKey);
                    String submitCount = redisService.getValueByKey(submitKey);
                    p.setPassCount(passCount != null ? Integer.parseInt(passCount) : 0);
                    p.setSubmitCount(submitCount != null ? Integer.parseInt(submitCount) : 0);
                    problems.add(p);
                }
                // 将更新后的 Map 重新序列化为 JSON 并存储回 Redis
                String updatedProblemsJson = JSON.toJSONString(problemMap);
                String endTimeStr=redisService.getValueByKey(timeOutKey);
                Long ttlSeconds = TimeUtils.calculateTTL(endTimeStr);
                redisService.setKey(cacheKey,updatedProblemsJson,ttlSeconds+600);

            } else {
                List<CompetitionProblem> pids = competitionProblemService.getProblemList(cid);
                problems = new ArrayList<>();
                QueryWrapper<Competition> wrapper=new QueryWrapper<>();
                wrapper.eq("id",cid).select("end_time,begin_time");
                Competition competition=this.baseMapper.selectOne(wrapper);
                String endTimeStr = competition.getEndTime();
                String beginTimeStr=competition.getBeginTime();
                Long ttlSeconds = TimeUtils.calculateTTL(endTimeStr);
                for (CompetitionProblem competitionProblem : pids) {
                    ProblemVo problem = problemService.getProblemInfo(competitionProblem.getProblemId(),cid);
                    String problemSubmitKey=String.format(PROBLEM_SUBMIT_KEY, cid, problem.getId());
                    String problemPassKey=String.format(PROBLEM_PASS_KEY, cid, problem.getId());
                    if (!redisService.IsExists(problemSubmitKey)&&ttlSeconds>0) {
                        problem.setSubmitCount(0);
                        problem.setPassCount(0);
                        redisService.setKey(problemSubmitKey,"0",ttlSeconds+600);
                        redisService.setKey(problemPassKey,"0",ttlSeconds+600);
                    }
                    if(ttlSeconds<0){
                        problem.setSubmitCount(competitionProblem.getSubmitCount());
                        problem.setPassCount(competitionProblem.getPassCount());
                    }
                    problems.add(problem);
                }
                if (!problems.isEmpty()&&ttlSeconds>0) {
                    Map<Long, ProblemVo> problemMap = new HashMap<>();
                    for (ProblemVo p : problems) {
                        problemMap.put(p.getId(), p);
                    }
                    String updatedProblemsJson = JSON.toJSONString(problemMap);
                    redisService.setKey(cacheKey,updatedProblemsJson,ttlSeconds+600);
                    redisService.setKey(timeOutKey,endTimeStr,ttlSeconds);
                    String timeBeginKey=String.format(TIME_BEGIN_KEY,cid);
                    redisService.setKey(timeBeginKey,beginTimeStr,ttlSeconds);
                }
            }
            return problems;
    }

    @Override
    public List<UserVo> getUserList(Long cid) {
            String rankingKey = String.format(RANKING_KEY, cid);
            List<User> users = new ArrayList<>();
        // 从Redis获取排名
            if (redisService.getTtl(rankingKey) >600) {
                Set<ZSetOperations.TypedTuple<String>> userTuples = redisService.getZset(rankingKey);
                userTuples.forEach(tuple -> {
                    User user = new User();
                    user.setName(tuple.getValue());
                    String userPassKey = String.format(USER_PASS_COUNT_KEY, cid, user.getName());
                    String userPenaltyKey = String.format(USER_PENALTY_KEY, cid, user.getName());

                    String passCountStr = redisService.getValueByKey(userPassKey);
                    String penaltyTimeStr = redisService.getValueByKey(userPenaltyKey);
                    
                    user.setPassCount(passCountStr != null ? Integer.parseInt(passCountStr) : 0);
                    user.setPenaltyTime(penaltyTimeStr != null ? Integer.parseInt(penaltyTimeStr) : 0);
                    users.add(user);
                });
            } else {
                // 从数据库获取用户列表
                QueryWrapper<CompetitionUser> wrapper = new QueryWrapper<>();
                wrapper.eq("competition_id",cid);
                List<CompetitionUser> competitionUsers = competitionUserService.getUserList(cid);
                for (CompetitionUser cu : competitionUsers) {
                    User user = new User();
                    user.setName(cu.getName());
                    user.setPassCount(cu.getPassCount());
                    user.setPenaltyTime(cu.getPenaltyTime());
                    users.add(user);
                }
            }

            return users.stream()
                    .map(UserVo::new)
                    .collect(Collectors.toList());
    }

    @Override
    public void judgeIsOpenById(String now, Long id) {
        QueryWrapper<Competition> queryWrapper = new QueryWrapper<>();
        queryWrapper.select("begin_time")
                .eq("id", id);

        Competition competition = this.baseMapper.selectOne(queryWrapper);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        LocalDateTime nowDateTime = LocalDateTime.parse(now, formatter);
        LocalDateTime beginDateTime = LocalDateTime.parse(competition.getBeginTime(), formatter);
        if (nowDateTime.isBefore(beginDateTime)) {
            throw new BusinessException("比赛暂未开始，请遵守规则");
        }
    }

    @Override
    public void judgeIsEndById(String now,Long id) {
        QueryWrapper<Competition> queryWrapper = new QueryWrapper<>();
        queryWrapper.select("end_time")
                .eq("id", id);

        Competition competition = this.baseMapper.selectOne(queryWrapper);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        LocalDateTime nowDateTime = LocalDateTime.parse(now, formatter);
        LocalDateTime endDateTime = LocalDateTime.parse(competition.getEndTime(), formatter);
        if (nowDateTime.isAfter(endDateTime)) {
            throw new BusinessException("比赛已结束，无法提交题目");
        }
    }

    @Override
    @Transactional
    public void deleteCompetition(Long id) {
        this.baseMapper.deleteById(id);
        competitionUserService.deleteCompetition(id);
        competitionProblemService.deleteCompetition(id);
        submissionService.deleteSubmissionsByCid(id);
        userSolvedProblemService.deleteCompetition(id);
    }

    @Override
    public void addNumber(Long id) {
        LambdaUpdateWrapper<Competition> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.setSql("number = number + 1")
                .eq(Competition::getId, id);
        this.update(updateWrapper);
    }

    @Override
    public Long getCompetitionCount() {
        return this.count();
    }
}
