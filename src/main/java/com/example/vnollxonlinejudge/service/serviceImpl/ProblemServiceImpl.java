package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.domain.*;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.ProblemTagService;
import com.example.vnollxonlinejudge.service.RedisService;
import com.example.vnollxonlinejudge.service.UserSolvedProblemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class ProblemServiceImpl extends ServiceImpl<ProblemMapper, Problem> implements ProblemService {
    @Autowired
    private ProblemTagService problemTagService;
    @Autowired
    private UserSolvedProblemService userSolvedProblemService;
    @Autowired
    private RedisService redisService;
    @Override
    public void createProblem(String title, String description, int timelimit, int memorylimit,
                                String difficulty, String inputexample, String outputexample, String datazip) {
        Problem problem = new Problem();
        problem.setTitle(title);
        problem.setDescription(description);
        problem.setTimeLimit(timelimit);
        problem.setMemoryLimit(memorylimit);
        problem.setDifficulty(difficulty);
        problem.setInputExample(inputexample);
        problem.setOutputExample(outputexample);
        problem.setDatazip(datazip);
        save(problem);
    }

    @Override
    public void deleteProblem(long id) {
        QueryWrapper<Problem> wrapper = new QueryWrapper<>();
        wrapper.eq("id", id);

        if (count(wrapper) == 0) {
            throw new BusinessException("题目不存在或已被删除");
        }
        removeById(id);
    }

    @Override
    public void updateProblem(long id, String title, String description, int timelimit,
                                int memorylimit, String difficulty, String inputexample,
                                String outputexample, String datazip) {
        QueryWrapper<Problem> wrapper = new QueryWrapper<>();
        wrapper.eq("id", id);

        if (count(wrapper) == 0) {
            throw new BusinessException("题目不存在或已被删除");
        }
        Problem problem = new Problem();
        problem.setId(id);
        problem.setTitle(title);
        problem.setDescription(description);
        problem.setTimeLimit(timelimit);
        problem.setMemoryLimit(memorylimit);
        problem.setDifficulty(difficulty);
        problem.setInputExample(inputexample);
        problem.setOutputExample(outputexample);
        problem.setDatazip(datazip);
        updateById(problem);
    }

    @Override
    public Problem getProblemInfo(long pid, long cid) {
        Problem problem;
        if (cid == 0) {
            problem = getById(pid);
        } else {
            String cacheKey = "competition:" + cid + ":problems";
            String problemsJson = redisService.getValueByKey(cacheKey);
            if (problemsJson != null) {

                Map<Integer, Problem> problemMap = JSON.parseObject(problemsJson,
                        new TypeReference<Map<Integer, Problem>>() {});
                problem = problemMap.get((int) pid);
            } else {
                problem = getById(pid);
            }
        }
        if (problem == null) {
            throw new BusinessException("题目不存在或已被删除");
        }
        return problem;
    }
    @Override
    public List<Problem> getProblemList(int offset, int size) {
        QueryWrapper<Problem> wrapper = new QueryWrapper<>();
        wrapper.last("LIMIT " + offset + "," + size);
        List<Problem> problems = list(wrapper);
        if (problems.isEmpty()) {
            throw new BusinessException("暂无题目");
        }
        return problems;
    }
    @Override
    public int getProblemCount() {
        QueryWrapper<Problem> wrapper = new QueryWrapper<>();
        return (int) count(wrapper);
    }

    @Override
    public List<String> getTagNames(long pid){
        return problemTagService.getTagNames(pid);
    }
    @Override
    public List<Problem> getProblemListByKeywords(String name, long pid, int offset, int size) {
            QueryWrapper<Problem> wrapper = new QueryWrapper<>();
            if (name != null && !name.isEmpty()) {
                wrapper.like("title", name);
            }
            if (pid > 0) {
                wrapper.eq("id", pid);
            }
            wrapper.last("LIMIT " + offset + "," + size);

            return list(wrapper);
    }
    @Override
    public int getCountByKeywords(String name, long pid) {
            QueryWrapper<Problem> wrapper = new QueryWrapper<>();
            if (name != null && !name.isEmpty()) {
                wrapper.like("title", name);
            }
            if (pid > 0) {
                wrapper.eq("id", pid);
            }
            return (int) count(wrapper);
    }

    @Override
    public boolean judgeIsSolve(long pid, long uid, long cid) {
        UserSolvedProblem userSolvedProblems=userSolvedProblemService.judgeUserIsPass(pid,uid,cid);
        return userSolvedProblems != null;
    }

    @Override
    public void updatePassCount(long pid, int ok) {
        // 使用MyBatis-Plus的update wrapper进行原子更新
        UpdateWrapper<Problem> updateWrapper = new UpdateWrapper<>();
        updateWrapper.eq("id", pid)
                .setSql("pass_count = pass_count + " + ok)
                .setSql("submit_count = submit_count + 1");
        update(updateWrapper);
    }

    @Override
    public void addUserSolveRecord(long pid, long uid, long cid) {
        userSolvedProblemService.createUserSolveProblem(uid,pid,cid);
    }
}
