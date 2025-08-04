package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.dto.response.problem.ProblemResponse;
import com.example.vnollxonlinejudge.model.dto.response.tag.TagResponse;
import com.example.vnollxonlinejudge.model.entity.*;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.service.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ProblemServiceImpl extends ServiceImpl<ProblemMapper, Problem> implements ProblemService {
    private static final Logger logger = LoggerFactory.getLogger(ProblemServiceImpl.class);
    @Autowired
    private ProblemTagService problemTagService;
    @Autowired
    private UserSolvedProblemService userSolvedProblemService;
    @Autowired
    private RedisService redisService;
    @Autowired
    private OssService ossService;
    @Autowired
    private SubmissionService submissionService;
    @Autowired
    private TagService tagService;
    @Override
    @Transactional
    public void createProblem(String title, String description, int timeLimit, int memoryLimit,
                                String difficulty,String inputFormat,String outputFormat,
                              String inputExample, String outputExample, String hint,String open,
                              MultipartFile testCaseFile,List<String> tags
    ) {
        Problem problem = new Problem();
        problem.setTitle(title);
        problem.setDescription(description);
        problem.setTimeLimit(timeLimit);
        problem.setMemoryLimit(memoryLimit);
        problem.setDifficulty(difficulty);
        problem.setInputFormat(inputFormat);
        problem.setOutputFormat(outputFormat);
        problem.setInputExample(inputExample);
        problem.setOutputExample(outputExample);
        problem.setHint(hint);
        problem.setOpen(Objects.equals(open, "true"));
        save(problem); // 插入数据库，获取自增ID
        problemTagService.deleteTagByProblem(problem.getId());
        for (String s:tags){
            tagService.createTag(s);
            problemTagService.addRelated(s,problem.getId());
        }
        // 2. 使用获取到的ID处理文件上传
        try {
            if (testCaseFile != null && !testCaseFile.isEmpty()) {
                ossService.uploadFile(problem.getId() + ".zip", testCaseFile);
            }
        } catch (IOException e) {
            throw new BusinessException("测试用例文件上传失败");
        }
        problem.setDatazip(problem.getId()+".zip");
    }

    @Override
    @Transactional
    public void deleteProblemByAdmin(long id) {
        Problem problem=this.getById(id);
        if (problem==null) {
            throw new BusinessException("题目不存在或已被删除");
        }
        try {
            ossService.deleteFile(problem.getDatazip());
        }catch (IOException e){
            throw new BusinessException("文件上传失败，服务器异常");
        }
        submissionService.deleteSubmissionsByPid(id);
        removeById(id);
    }

    @Override
    @Transactional
    public void updateProblem(long id, String title, String description, int timeLimit,
                              int memoryLimit, String difficulty, String inputFormat,
                              String outputFormat, String inputExample,
                              String outputExample, String hint,String open, MultipartFile testCaseFile,
                              List<String> tags
    )  {
        QueryWrapper<Problem> wrapper = new QueryWrapper<>();
        wrapper.eq("id", id);

        if (count(wrapper) == 0) {
            throw new BusinessException("题目不存在或已被删除");
        }
        Problem problem = this.getById(id);
        problem.setTitle(title);
        problem.setDescription(description);
        problem.setTimeLimit(timeLimit);
        problem.setMemoryLimit(memoryLimit);
        problem.setDifficulty(difficulty);
        problem.setInputFormat(inputFormat);
        problem.setOutputFormat(outputFormat);
        problem.setInputExample(inputExample);
        problem.setOutputExample(outputExample);
        problem.setHint(hint);
        problem.setOpen(Objects.equals(open, "true"));
        problemTagService.deleteTagByProblem(problem.getId());
        for (String s:tags){
            System.out.println(s);
            tagService.createTag(s);
            problemTagService.addRelated(s,problem.getId());
        }
        try {
            if (testCaseFile != null && !testCaseFile.isEmpty()) {
                ossService.uploadFile(id + ".zip", testCaseFile);
            }
        } catch (IOException e) {
            throw new BusinessException("文件上传失败，服务器异常");
        }
        updateById(problem);
    }

    @Override
    public ProblemResponse getProblemInfo(long pid, long cid) {
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
        return new ProblemResponse(problem);
    }

    @Override
    public List<String> getTagNames(long pid){
        return problemTagService.getTagNames(pid);
    }
    @Override
    public List<ProblemResponse> getProblemList(String keyword, long pid, int offset, int size,boolean ok) {
        QueryWrapper<Problem> wrapper = new QueryWrapper<>();
        if (!ok){
            wrapper.eq("open",1);
            wrapper.select("id, title, difficulty, submit_count, pass_count");
        }
        if (StringUtils.isNotBlank(keyword)){
            if (pid>0){
                wrapper.and(wq -> wq.like("title", keyword).or().eq("id", pid));
            }
            else{
                wrapper.like("title", keyword);
            }
            List<Long> pids=problemTagService.getProblemByTag(keyword);
            if (pids != null && !pids.isEmpty()) {
                wrapper.or().in("id", pids);
            }
        }
        wrapper.last("LIMIT " + offset + "," + size);
        List<Problem> problems=list(wrapper);
        return (!ok ? list(wrapper) : problems).stream()
                .map(item -> {
                    ProblemResponse response = new ProblemResponse(item);
                    if (ok) {
                        response.setTags(problemTagService.getTagNames(((Problem) item).getId()));
                    }
                    return response;
                })
                .collect(Collectors.toList());
    }
    @Override
    public Long getCount(String keyword, long pid,boolean ok) {
        QueryWrapper<Problem> wrapper = new QueryWrapper<>();
        if (!ok)wrapper.eq("open",1);
        if (StringUtils.isNotBlank(keyword)){
            if (pid>0){
                wrapper.and(wq -> wq.like("title", keyword).or().eq("id", pid));
            }
            else{
                wrapper.like("title", keyword);
            }
        }
        return count(wrapper);
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
