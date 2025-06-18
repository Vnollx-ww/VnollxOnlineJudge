package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.example.vnollxonlinejudge.domain.*;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.utils.Result;
import com.example.vnollxonlinejudge.utils.TimeUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.resps.Tuple;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class CompetitionServiceImpl implements CompetitionService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    @Autowired
    private CompetitionMapper competitionMapper;
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private Competition_ProblemsMapper competition_problemsMapper;
    @Autowired
    private Competition_UsersMapper competition_usersMapper;
    @Autowired
    private ProblemMapper problemMapper;
    @Autowired
    private SubmissionMapper submissionMapper;
    @Autowired
    private JedisPool jedisPool;
    private static final String PROBLEM_PASS_KEY = "competition_problem_pass:%d:%d"; // cid:pid
    private static final String PROBLEM_SUBMIT_KEY = "competition_problem_submit:%d:%d"; // cid:pid
    private static final String USER_PASS_COUNT_KEY = "competition_user_pass:%d:%s"; // cid:uid
    private static final String USER_PENALTY_KEY = "competition_user_penalty:%d:%s"; // cid:uid
    private static final String TIME_OUT_KEY = "competition_time_out:%d"; // cid
    private static final String RANKING_KEY = "competition_ranking:%d"; // cid
    @Override
    public Result getCompetitionById(long id) {
        try {
            Competition competition = competitionMapper.getCompetitionById(id);
            if (competition == null) {
                return Result.LogicError("比赛不存在");
            }
            competition.setPassword("无权限查看");
            return Result.Success(competition, "获取比赛信息成功");
        }catch (Exception e) {
            logger.error("查询比赛失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @Override
    public Result createCompetition(String title, String description, String begin_time, String end_time, String password) {
        try {
            boolean ok=false;
            if(!Objects.equals(password, ""))ok=true;
            competitionMapper.createCompetition(title,description,begin_time,end_time,password,ok);
            return Result.Success("创建比赛成功");
        } catch (Exception e) {
            logger.error("创建比赛失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getCompetitionList() {
        try {
            List<Competition> competitionList=competitionMapper.getCompetitionList();
            for (Competition competition : competitionList) {
                competition.setPassword("无权限查看");
            }
            return Result.Success(competitionList,"查询比赛列表成功");
        } catch (Exception e) {
            logger.error("查询比赛失列表败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result confirmPassword(Long id,String password) {
        try{
            Competition competition=competitionMapper.getCompetitionById(id);
            if(competition==null){
                return Result.LogicError("比赛不存在");
            }
            if(!Objects.equals(competition.getPassword(), password)){
                return Result.LogicError("密码错误");
            }
            return Result.Success("密码正确");
        }catch (Exception e){
            logger.error("验证密码失败: ",e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getProblemList(long cid) {
        try {
            Jedis jedis=jedisPool.getResource();
            String cacheKey = "competition:" + cid + ":problems";
            String problemsJson = jedis.get(cacheKey);
            List<Problem> problems = new ArrayList<>();
            if (problemsJson != null&&jedis.ttl(cacheKey)>600) {
                // 直接从缓存反序列化为 Map<Integer, Problem>
                TypeReference<Map<Integer, Problem>> typeRef = new TypeReference<Map<Integer, Problem>>() {};
                Map<Integer, Problem> problemMap = JSON.parseObject(problemsJson, typeRef);
                // 设置提交和通过次数
                for (Problem p : problemMap.values()) {
                    String passKey = String.format(PROBLEM_PASS_KEY, cid, p.getId());
                    String submitKey = String.format(PROBLEM_SUBMIT_KEY, cid, p.getId()); // 假设存在提交次数的key
                    // 获取并设置通过次数和提交次数（增加空值处理）
                    String passCount = jedis.get(passKey);
                    String submitCount = jedis.get(submitKey);
                    p.setPassCount(passCount != null ? Integer.parseInt(passCount) : 0);
                    p.setSubmitCount(submitCount != null ? Integer.parseInt(submitCount) : 0);
                    problems.add(p);
                }

                // 将更新后的 Map 重新序列化为 JSON 并存储回 Redis
                String updatedProblemsJson = JSON.toJSONString(problemMap);
                String timeOutKey = String.format(TIME_OUT_KEY, cid);
                String endTimeStr = jedis.get(timeOutKey);
                long ttlSeconds = TimeUtils.calculateTTL(endTimeStr);
                jedis.setex(cacheKey, ttlSeconds+600, updatedProblemsJson);
                System.out.println("从缓存拿取数据啦");

            } else {
                List<Competition_Problem> pids = competition_problemsMapper.getProblemList(cid);
                problems = new ArrayList<>();
                String endTimeStr = competitionMapper.getEndTimeById(cid);
                long ttlSeconds = TimeUtils.calculateTTL(endTimeStr);
                for (Competition_Problem competitionProblem : pids) {
                    Problem problem = problemMapper.getProblemById(competitionProblem.getProblemId());
                    String problemSubmitKey=String.format(PROBLEM_SUBMIT_KEY, cid, problem.getId());
                    String problemPassKey=String.format(PROBLEM_PASS_KEY, cid, problem.getId());
                    if (!jedis.exists(problemSubmitKey)&&ttlSeconds>0) {
                        problem.setSubmitCount(0);
                        problem.setPassCount(0);
                        jedis.setex(problemSubmitKey, ttlSeconds+600, "0");
                        jedis.setex(problemPassKey, ttlSeconds+600, "0");
                    }
                    if(ttlSeconds<0){
                        problem.setSubmitCount(competitionProblem.getSubmitCount());
                        problem.setPassCount(competitionProblem.getPassCount());
                    }
                    problems.add(problem);
                }
                if (!problems.isEmpty()&&ttlSeconds>0) {
                    Map<Integer, Problem> problemMap = new HashMap<>();
                    for (Problem p : problems) {
                        problemMap.put(p.getId(), p);
                    }
                    String updatedProblemsJson = JSON.toJSONString(problemMap);
                    jedis.setex(cacheKey, ttlSeconds+600, updatedProblemsJson);
                    String timeOutKey=String.format(TIME_OUT_KEY,cid);
                    jedis.setex(timeOutKey,ttlSeconds,endTimeStr);
                }
            }
            jedis.close();
            return Result.Success(problems, "获取比赛题目列表成功");
        } catch (Exception e) {
            logger.error("查询比赛题目列表失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getUserList(long cid) {
        try {
            String rankingKey = String.format(RANKING_KEY, cid);
            Jedis jedis=jedisPool.getResource();
            List<User> users = new ArrayList<>();
            if(jedis.ttl(rankingKey)!=-2){
                List<Tuple> userTuples = jedis.zrangeWithScores(rankingKey, 0, -1);
                for (Tuple tuple : userTuples) {
                    String userName = tuple.getElement();
                    //double score = tuple.getScore();
                    User user =new User();
                    user.setName(userName);
                    String userPassKey = String.format(USER_PASS_COUNT_KEY, cid, userName);
                    String userPenaltyKey = String.format(USER_PENALTY_KEY, cid, userName);
                    user.setPassCount(Integer.parseInt(jedis.get(userPassKey)));
                    user.setPenaltyTime(Integer.parseInt(jedis.get(userPenaltyKey)));
                    users.add(user);
                }
            }else{
                List<Competition_User> competitionUsers=competition_usersMapper.getUserList(cid);
                for (Competition_User competitionUser:competitionUsers){
                    User u=new User();
                    u.setPenaltyTime(competitionUser.getPenaltyTime());
                    u.setPassCount(competitionUser.getPassCount());
                    u.setName(competitionUser.getName());
                    users.add(u);
                }
            }
            jedis.close();
            return Result.Success(users, "获取比赛用户列表成功");
        } catch (Exception e) {
            logger.error("查询比赛用户列表失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result judgeIsOpenById(String now, long id) {
        try {
            String beginTime = competitionMapper.getBeginTimeById(id);
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            LocalDateTime nowDateTime = LocalDateTime.parse(now, formatter);
            LocalDateTime beginDateTime = LocalDateTime.parse(beginTime, formatter);
            if (nowDateTime.isBefore(beginDateTime)) {
                return Result.Success("比赛暂未开始，请遵守规则，并不要企图通过url访问到题目");
            } else {
                return Result.Success("");
            }
        } catch (Exception e) {
            logger.error("查询比赛信息失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result judgeIsEndById(String now,long id) {
        try {
            String endTime = competitionMapper.getEndTimeById(id);
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            LocalDateTime nowDateTime = LocalDateTime.parse(now, formatter);
            LocalDateTime endDateTime = LocalDateTime.parse(endTime, formatter);
            if (nowDateTime.isAfter(endDateTime)) {
                return Result.Success("比赛已结束，无法提交题目");
            } else {
                return Result.Success("");
            }
        } catch (Exception e) {
            logger.error("查询比赛信息失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }


}
