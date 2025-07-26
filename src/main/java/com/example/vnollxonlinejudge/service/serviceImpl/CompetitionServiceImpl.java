package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.dto.response.competition.CompetitionResponse;
import com.example.vnollxonlinejudge.model.dto.response.problem.ProblemResponse;
import com.example.vnollxonlinejudge.model.dto.response.user.UserResponse;
import com.example.vnollxonlinejudge.model.entity.*;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.service.*;
import com.example.vnollxonlinejudge.utils.TimeUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import redis.clients.jedis.resps.Tuple;
import com.example.vnollxonlinejudge.common.result.Result;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CompetitionServiceImpl extends ServiceImpl<CompetitionMapper, Competition> implements CompetitionService {
    private static final Logger logger = LoggerFactory.getLogger(CompetitionService.class);
    @Autowired
    private CompetitionUserService competitionUserService;
    @Autowired
    private CompetitionProblemService competitionProblemService;
    @Autowired
    private ProblemService problemService;
    @Autowired
    private RedisService redisService;
    private static final String PROBLEM_PASS_KEY = "competition_problem_pass:%d:%d"; // cid:pid
    private static final String PROBLEM_SUBMIT_KEY = "competition_problem_submit:%d:%d"; // cid:pid
    private static final String USER_PASS_COUNT_KEY = "competition_user_pass:%d:%s"; // cid:uid
    private static final String USER_PENALTY_KEY = "competition_user_penalty:%d:%s"; // cid:uid
    private static final String TIME_OUT_KEY = "competition_time_out:%d"; // cid
    private static final String RANKING_KEY = "competition_ranking:%d"; // cid
    @Override
    public CompetitionResponse getCompetitionById(long id) {
        Competition competition = this.baseMapper.selectById(id);
        if (competition == null) {
            throw new BusinessException("比赛不存在");
        }
        return new CompetitionResponse(competition);
    }
    @Override
    public void createCompetition(String title, String description, String begin_time, String end_time, String password) {
        boolean hasPassword = !Objects.equals(password, "");
        Competition competition = new Competition();
        competition.setTitle(title);
        competition.setDescription(description);
        competition.setBeginTime(begin_time);
        competition.setEndTime(end_time);
        competition.setPassword(password);
        competition.setNeedPassword(hasPassword);;

        this.save(competition);
    }

    @Override
    public List<CompetitionResponse> getCompetitionList() {
        List<Competition> competitionList = this.list();
        return competitionList.stream()
                .map(CompetitionResponse::new)
                .collect(Collectors.toList());
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
    public List<ProblemResponse> getProblemList(long cid) {
            String cacheKey = "competition:" + cid + ":problems";
            String problemsJson = redisService.getValueByKey(cacheKey);
            List<ProblemResponse> problems = new ArrayList<>();
            if (problemsJson != null&&redisService.getTtl(cacheKey)>600) {
                TypeReference<Map<Integer, ProblemResponse>> typeRef = new TypeReference<Map<Integer, ProblemResponse>>() {};
                Map<Integer, ProblemResponse> problemMap = JSON.parseObject(problemsJson, typeRef);
                // 设置提交和通过次数
                for (ProblemResponse p : problemMap.values()) {
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
                String timeOutKey = String.format(TIME_OUT_KEY, cid);
                String endTimeStr=redisService.getValueByKey(timeOutKey);
                long ttlSeconds = TimeUtils.calculateTTL(endTimeStr);
                redisService.setkey(cacheKey,updatedProblemsJson,ttlSeconds+600);

            } else {
                List<CompetitionProblem> pids = competitionProblemService.getProblemList(cid);
                problems = new ArrayList<>();
                QueryWrapper<Competition> wrapper=new QueryWrapper<>();
                wrapper.eq("id",cid).select("end_time");
                String endTimeStr = this.baseMapper.selectOne(wrapper).getEndTime();
                long ttlSeconds = TimeUtils.calculateTTL(endTimeStr);
                for (CompetitionProblem competitionProblem : pids) {
                    ProblemResponse problem = problemService.getProblemInfo(competitionProblem.getProblemId(),cid);
                    String problemSubmitKey=String.format(PROBLEM_SUBMIT_KEY, cid, problem.getId());
                    String problemPassKey=String.format(PROBLEM_PASS_KEY, cid, problem.getId());
                    if (!redisService.IsExists(problemSubmitKey)&&ttlSeconds>0) {
                        problem.setSubmitCount(0);
                        problem.setPassCount(0);
                        redisService.setkey(problemSubmitKey,"0",ttlSeconds+600);
                        redisService.setkey(problemPassKey,"0",ttlSeconds+600);
                    }
                    if(ttlSeconds<0){
                        problem.setSubmitCount(competitionProblem.getSubmitCount());
                        problem.setPassCount(competitionProblem.getPassCount());
                    }
                    problems.add(problem);
                }
                if (!problems.isEmpty()&&ttlSeconds>0) {
                    Map<Long,ProblemResponse> problemMap = new HashMap<>();
                    for (ProblemResponse p : problems) {
                        problemMap.put(p.getId(), p);
                    }
                    String updatedProblemsJson = JSON.toJSONString(problemMap);
                    redisService.setkey(cacheKey,updatedProblemsJson,ttlSeconds+600);
                    String timeOutKey=String.format(TIME_OUT_KEY,cid);
                    redisService.setkey(timeOutKey,endTimeStr,ttlSeconds);
                }
            }
            return problems;
    }

    @Override
    public List<UserResponse> getUserList(long cid) {
            String rankingKey = String.format(RANKING_KEY, cid);
            List<User> users = new ArrayList<>();
        // 从Redis获取排名
            if (redisService.getTtl(rankingKey) >600) {
                List<Tuple> userTuples = redisService.getZset(rankingKey);
                userTuples.forEach(tuple -> {
                    User user = new User();
                    user.setName(tuple.getElement());
                    String userPassKey = String.format(USER_PASS_COUNT_KEY, cid, user.getName());
                    String userPenaltyKey = String.format(USER_PENALTY_KEY, cid, user.getName());

                    user.setPassCount(Integer.parseInt(redisService.getValueByKey(userPassKey)));
                    user.setPenaltyTime(Integer.parseInt(redisService.getValueByKey(userPenaltyKey)));
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
                    .map(UserResponse::new)
                    .collect(Collectors.toList());
    }

    @Override
    public void judgeIsOpenById(String now, long id) {
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
    public void judgeIsEndById(String now,long id) {
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

}
