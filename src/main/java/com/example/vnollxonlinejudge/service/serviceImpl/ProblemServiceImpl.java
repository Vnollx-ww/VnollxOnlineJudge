package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.dto.admin.AdminAddProblemDTO;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveProblemDTO;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.entity.*;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.service.*;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ProblemServiceImpl extends ServiceImpl<ProblemMapper, Problem> implements ProblemService {
    private static final Logger logger = LoggerFactory.getLogger(ProblemServiceImpl.class);
    private final ProblemTagService problemTagService;
    private final UserSolvedProblemService userSolvedProblemService;
    private final RedisService redisService;
    private final OssService ossService;
    private final SubmissionService submissionService;
    private final TagService tagService;

    @Autowired
    public ProblemServiceImpl(
            ProblemTagService problemTagService,
            UserSolvedProblemService userSolvedProblemService,
            @Lazy RedisService redisService,
            OssService ossService,
            @Lazy SubmissionService submissionService,
            TagService tagService
    ) {
        this.problemTagService=problemTagService;
        this.userSolvedProblemService=userSolvedProblemService;
        this.redisService=redisService;
        this.ossService=ossService;
        this.submissionService=submissionService;
        this.tagService=tagService;
    }

    @Override
    @Transactional
    public void createProblem(AdminSaveProblemDTO dto) {
        Problem problem=Problem.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .timeLimit(Integer.valueOf(dto.getTimeLimit()))
                .memoryLimit(Integer.valueOf(dto.getMemoryLimit()))
                .difficulty(dto.getDifficulty())
                .inputFormat(dto.getInputFormat())
                .outputFormat(dto.getOutputFormat())
                .inputExample(dto.getInputExample())
                .outputExample(dto.getOutputExample())
                .hint(dto.getHint())
                .open(Objects.equals(dto.getOpen(), "true"))
                .build();

        save(problem); // 插入数据库，获取自增ID
        problemTagService.deleteTagByProblem(problem.getId());
        for (String s:dto.getTags()){
            tagService.createTag(s);
            problemTagService.addRelated(s,problem.getId());
        }
        // 2. 使用获取到的ID处理文件上传
        try {
            if (dto.getTestCaseFile() != null && !dto.getTestCaseFile().isEmpty()) {
                ossService.uploadFile(problem.getId() + ".zip", dto.getTestCaseFile());
            }
        } catch (IOException e) {
            throw new BusinessException("测试用例文件上传失败");
        }
        problem.setDatazip(problem.getId()+".zip");
    }

    @Override
    @Transactional
    public void deleteProblemByAdmin(Long id) {
        Problem problem=this.getById(id);
        if (problem==null) {
            throw new BusinessException("题目不存在或已被删除");
        }
        try {
            ossService.deleteFile(problem.getId()+".zip");
        }catch (IOException e){
            throw new BusinessException("文件删除失败，服务器异常");
        }
        submissionService.deleteSubmissionsByPid(id);
        removeById(id);
    }

    @Override
    @Transactional
    public void updateProblem(AdminSaveProblemDTO dto)  {
        QueryWrapper<Problem> wrapper = new QueryWrapper<>();
        wrapper.eq("id", dto.getId());

        if (count(wrapper) == 0) {
            throw new BusinessException("题目不存在或已被删除");
        }
        Problem problem = this.getById(dto.getId());
        problem.setTitle(dto.getTitle());
        problem.setDescription(dto.getDescription());
        problem.setTimeLimit(Integer.valueOf(dto.getTimeLimit()));
        problem.setMemoryLimit(Integer.valueOf(dto.getMemoryLimit()));
        problem.setDifficulty(dto.getDifficulty());
        problem.setInputFormat(dto.getInputFormat());
        problem.setOutputFormat(dto.getOutputFormat());
        problem.setInputExample(dto.getInputExample());
        problem.setOutputExample(dto.getOutputExample());
        problem.setHint(dto.getHint());
        problem.setOpen(Objects.equals(dto.getOpen(), "true"));
        problemTagService.deleteTagByProblem(problem.getId());
        for (String s: dto.getTags()){
            tagService.createTag(s);
            problemTagService.addRelated(s,problem.getId());
        }
        try {
            if (dto.getTestCaseFile() != null && !dto.getTestCaseFile().isEmpty()) {
                ossService.uploadFile(dto.getId() + ".zip", dto.getTestCaseFile());
            }
        } catch (IOException e) {
            throw new BusinessException("文件上传失败，服务器异常");
        }
        updateById(problem);
    }

    @Override
    public ProblemVo getProblemInfo(Long pid, Long cid,String name) {
        Problem problem = null;
        if (cid == 0) {
            if (pid!=null&&pid!=0) problem = getById(pid);
            else{
                QueryWrapper<Problem> problemQueryWrapper=new QueryWrapper<>();
                problemQueryWrapper.like("title",name);
            }
        } else {
            String cacheKey = "competition:" + cid + ":problems";
            String problemsJson = redisService.getValueByKey(cacheKey);
            if (problemsJson != null) {

                Map<Long, Problem> problemMap = JSON.parseObject(problemsJson,
                        new TypeReference<>() {
                        });
                problem = problemMap.get(pid);
            } else {
                if (pid!=null&&pid!=0) problem = getById(pid);
                else{
                    QueryWrapper<Problem> problemQueryWrapper=new QueryWrapper<>();
                    problemQueryWrapper.like("title",name);
                }
            }
        }
        if (problem == null) {
            throw new BusinessException("题目不存在或已被删除");
        }
        return new ProblemVo(problem);
    }

    @Override
    public List<String> getTagNames(Long pid){
        return problemTagService.getTagNames(pid);
    }


    @Override
    public List<ProblemVo> getProblemList(String keyword, Long pid, int offset, int size, boolean ok) {
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
                    ProblemVo response = new ProblemVo(item);
                    if (ok) {
                        response.setTags(problemTagService.getTagNames(((Problem) item).getId()));
                    }
                    return response;
                })
                .collect(Collectors.toList());
    }
    @Override
    public Long getCount(String keyword, Long pid,boolean ok) {
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
    public boolean isSolved(Long pid, Long uid, Long cid) {
        UserSolvedProblem userSolvedProblems=userSolvedProblemService.judgeUserIsPass(pid,uid,cid);
        return userSolvedProblems != null;
    }

    @Override
    public void updatePassCount(Long pid, int ok) {
        // 使用MyBatis-Plus的update wrapper进行原子更新
        UpdateWrapper<Problem> updateWrapper = new UpdateWrapper<>();
        updateWrapper.eq("id", pid)
                .setSql("pass_count = pass_count + " + ok)
                .setSql("submit_count = submit_count + 1");
        update(updateWrapper);
    }

    @Override
    public void addUserSolveRecord(Long pid, Long uid, Long cid,String problemName) {
        userSolvedProblemService.createUserSolveProblem(uid,pid,cid,problemName);
    }

    @Override
    public List<Long> getAllProblemId() {
        LambdaQueryWrapper<Problem> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.select(Problem::getId);

        return this.list(queryWrapper).stream()
                .map(Problem::getId)
                .collect(Collectors.toList());
    }
}
