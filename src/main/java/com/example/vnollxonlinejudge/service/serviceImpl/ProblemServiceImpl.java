package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.example.vnollxonlinejudge.domain.*;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.producer.SubmissionProducer;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.RedisService;
import com.example.vnollxonlinejudge.utils.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

import java.util.List;
import java.util.Map;

@Service
public class ProblemServiceImpl implements ProblemService {
    private static final Logger logger = LoggerFactory.getLogger(ProblemService.class);
    @Autowired
    private ProblemMapper problemMapper;
    @Autowired
    private Problem_TagsMapper problem_tagsMapper;
    @Autowired
    private SubmissionProducer submissionProducer;
    @Autowired
    private User_Solver_ProblemsMapper user_solver_problemsMapper;
    @Autowired
    private RedisService redisService;
    @Override
    public Result createProblem(String title, String description, int timelimit, int memorylimit, String difficulty, String inputexample, String outputexample, String datazip) {
        try {
            problemMapper.addProblem(title,description,timelimit,memorylimit,difficulty,inputexample,outputexample,datazip);
            return Result.Success("添加题目成功");
        } catch (Exception e) {
            logger.error("添加题目失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result deleteProblem(long id) {
        Problem problem = problemMapper.getProblemById(id);
        if (problem==null) {
            return Result.LogicError("题目不存在或已被删除");
        }
        try {
            problemMapper.deleteProblem(id);
            return Result.Success("题目删除成功");
        } catch (Exception e) {
            logger.error("删除题目失败", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result updateProblem(long id,String title, String description, int timelimit, int memorylimit, String difficulty, String inputexample, String outputexample, String datazip) {
        Problem problem = problemMapper.getProblemById(id);
        if (problem==null) {
            return Result.LogicError("题目不存在或已被删除");
        }
        try {
            problemMapper.updateProblem(id,title,description,timelimit,memorylimit,difficulty,inputexample,outputexample,datazip);
            return Result.Success("更新题目信息成功");
        }catch (Exception e) {
            logger.error("更改题目信息失败", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getProblemInfo(long pid,long cid) {
        Problem problem=null;
        if(cid==0){problem = problemMapper.getProblemById(pid);}
        else{
            String cacheKey = "competition:" + cid + ":problems";
            String problemsJson =redisService.getValueByKey(cacheKey);
            if (problemsJson!=null){
                TypeReference<Map<Integer, Problem>> typeRef = new TypeReference<Map<Integer, Problem>>() {
                };
                Map<Integer, Problem> problemMap = JSON.parseObject(problemsJson, typeRef);
                problem = problemMap.get((int) pid);
            }
            else{
                problem = problemMapper.getProblemById(pid);
            }
        }
        if (problem==null) {
            return Result.LogicError("题目不存在或已被删除");
        }
        return Result.Success(problem,"获取题目信息成功");
    }
    @Override
    public Result submitCodeToProblem(String code, String option,long pid,long uid,long cid,String create_time,String uname) {
        Submission submission=new Submission(code,option, pid,cid,uid,create_time);
        submission.setUserName(uname);
        //String messageInfo="rabbitmq!!!!!!";
        int priority=1;
        return Result.Success(submissionProducer.sendSubmission(priority,submission));
    }
    @Override
    public Result getProblemList(int offset,int size){
        try {
            List<Problem> problems=problemMapper.getProblemList(offset,size);
            if(problems==null){
                return Result.LogicError("暂无题目");
            }
            return Result.Success(problems,"获取题目列表信息成功");
        }catch (Exception e) {
            logger.error("获取题目列表信息失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @Override
    public Result getProblemCount(){
        try {
            int count = problemMapper.getProblemCount();
            return Result.Success(count, "获取题目数量成功");
        }catch (Exception e) {
            logger.error("获取题目数量失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @Override
    public Result getTagNames(long pid){
        try{
        List<String> tags= problem_tagsMapper.getTagNames(pid);
        return Result.Success(tags,"获取题目标签成功");
        }catch (Exception e) {
            logger.error("获取题目标签失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @Override
    public Result getProblemListByKeywords(String name,long pid,int offset,int size){
        try {
            List<Problem> problems=problemMapper.getProblemListByKeywords(name,pid,offset,size);
            return Result.Success(problems,"获取搜索题目成功");
        }catch (Exception e) {
            logger.error("获取搜索题目失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @Override
    public Result getCountByKeywords(String name, long pid) {
        try {
            int count = problemMapper.getCountByKeywords(name, pid);
            return Result.Success(count, "获取搜索题目数量成功");
        }catch (Exception e) {
            logger.error("获取搜索题目数量失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public boolean judgeIsSolve(long pid, long uid, long cid) {
        User_Solved_Problems userSolvedProblems=user_solver_problemsMapper.judgeUserIsPass(pid,uid,cid);
        return userSolvedProblems != null;
    }

    @Override
    public void updatePassCount(long pid, int ok) {
        problemMapper.updatePassCount(pid,ok);
        Result.Success("修改题目通过数成功");
    }

    @Override
    public void addUserSolveRecord(long pid, long uid, long cid) {
        user_solver_problemsMapper.createUserSolveProblem(uid,pid,cid);

    }

}
