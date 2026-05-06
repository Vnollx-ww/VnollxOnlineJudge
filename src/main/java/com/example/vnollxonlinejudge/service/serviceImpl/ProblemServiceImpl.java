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
import com.example.vnollxonlinejudge.model.dto.admin.ProblemExampleItemDTO;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemBasicVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemExampleVo;
import com.example.vnollxonlinejudge.model.entity.*;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.service.*;
import com.example.vnollxonlinejudge.utils.SnowflakeIdGenerator;
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
import java.util.ArrayList;
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
    private final TestCaseCacheService testCaseCacheService;
    private final ProblemExampleService problemExampleService;
    private final static SnowflakeIdGenerator gen = new SnowflakeIdGenerator(SnowflakeIdGenerator.defaultMachineId());
    @Autowired
    public ProblemServiceImpl(
            ProblemTagService problemTagService,
            UserSolvedProblemService userSolvedProblemService,
            @Lazy RedisService redisService,
            OssService ossService,
            @Lazy SubmissionService submissionService,
            TagService tagService,
            TestCaseCacheService testCaseCacheService,
            ProblemExampleService problemExampleService
    ) {
        this.problemTagService=problemTagService;
        this.userSolvedProblemService=userSolvedProblemService;
        this.redisService=redisService;
        this.ossService=ossService;
        this.submissionService=submissionService;
        this.tagService=tagService;
        this.testCaseCacheService=testCaseCacheService;
        this.problemExampleService=problemExampleService;
    }

    @Override
    public Problem getById(Long id) {
        return super.getById((java.io.Serializable) id);
    }

    @Override
    @Transactional
    public void createProblem(AdminSaveProblemDTO dto) {
        if (dto.getTestCaseFile() == null || dto.getTestCaseFile().isEmpty()) {
            throw new BusinessException("新建题目必须上传测试数据文件");
        }
        String judgeMode = dto.getJudgeMode() == null || dto.getJudgeMode().isBlank() ? "standard" : dto.getJudgeMode();
        if (Objects.equals(judgeMode, "special") && (dto.getCheckerFile() == null || dto.getCheckerFile().isEmpty())) {
            throw new BusinessException("构造题必须上传 checker 代码文件");
        }
        Problem problem=Problem.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .timeLimit(Integer.valueOf(dto.getTimeLimit()))
                .memoryLimit(Integer.valueOf(dto.getMemoryLimit()))
                .difficulty(dto.getDifficulty())
                .inputFormat(dto.getInputFormat())
                .outputFormat(dto.getOutputFormat())
                .judgeMode(judgeMode)
                .inputExample(dto.getInputExample())
                .outputExample(dto.getOutputExample())
                .hint(dto.getHint())
                .open(Objects.equals(dto.getOpen(), "true"))
                .build();
        problem.setSnakeId(gen.nextId());
        save(problem); // 插入数据库，获取自增ID
        problemTagService.deleteTagByProblem(problem.getId());
        tagService.addTags(dto.getTags());
        problemTagService.addRelatedTags(dto.getTags(),problem.getId());

        QueryWrapper<Problem> queryWrapper=new QueryWrapper<>();
        queryWrapper.eq("snake_id",problem.getSnakeId());
        problem=this.getOne(queryWrapper);
        // 保存多组样例到 problem_example
        List<ProblemExampleItemDTO> exampleList = dto.getExamplesList();
        if (exampleList != null && !exampleList.isEmpty()) {
            problemExampleService.saveExamples(problem.getId(), exampleList);
            problem.setInputExample(exampleList.get(0).getInput());
            problem.setOutputExample(exampleList.get(0).getOutput());
            updateById(problem);
        }
        // 2. 使用获取到的ID处理文件上传
        try {
            if (dto.getTestCaseFile() != null && !dto.getTestCaseFile().isEmpty()) {
                ossService.uploadFile(problem.getId() + ".zip", dto.getTestCaseFile());
            }
            if (dto.getCheckerFile() != null && !dto.getCheckerFile().isEmpty()) {
                ossService.uploadFile(problem.getId() + "_checker.cpp", dto.getCheckerFile());
                problem.setCheckerFile(problem.getId() + "_checker.cpp");
            }
        } catch (IOException e) {
            throw new BusinessException("测试用例文件上传失败");
        }
        problem.setDatazip(problem.getId()+".zip");
        updateById(problem);
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
            if (problem.getCheckerFile() != null && !problem.getCheckerFile().isBlank()) {
                ossService.deleteFile(problem.getCheckerFile());
            }
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
        String judgeMode = dto.getJudgeMode() == null || dto.getJudgeMode().isBlank() ? "standard" : dto.getJudgeMode();
        problem.setJudgeMode(judgeMode);
        if (Objects.equals(judgeMode, "special")
                && (problem.getCheckerFile() == null || problem.getCheckerFile().isBlank())
                && (dto.getCheckerFile() == null || dto.getCheckerFile().isEmpty())) {
            throw new BusinessException("构造题必须上传 checker 代码文件");
        }
        problem.setHint(dto.getHint());
        problem.setOpen(Objects.equals(dto.getOpen(), "true"));
        List<ProblemExampleItemDTO> exampleList = dto.getExamplesList();
        if (exampleList != null && !exampleList.isEmpty()) {
            problemExampleService.saveExamples(problem.getId(), exampleList);
            problem.setInputExample(exampleList.get(0).getInput());
            problem.setOutputExample(exampleList.get(0).getOutput());
        }
        problemTagService.deleteTagByProblem(problem.getId());
        for (String s: dto.getTags()){
            tagService.createTag(s);
            problemTagService.addRelated(s,problem.getId());
        }
        try {
            if (dto.getTestCaseFile() != null && !dto.getTestCaseFile().isEmpty()) {
                ossService.uploadFile(dto.getId() + ".zip", dto.getTestCaseFile());
                // 清除测试用例缓存，确保下次评测使用最新的测试用例
                testCaseCacheService.evictFromCache(dto.getId() + ".zip");
            }
            if (dto.getCheckerFile() != null && !dto.getCheckerFile().isEmpty()) {
                ossService.uploadFile(dto.getId() + "_checker.cpp", dto.getCheckerFile());
                problem.setCheckerFile(dto.getId() + "_checker.cpp");
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
                problem=this.getOne(problemQueryWrapper);
            }
        } else {
            if (pid!=null&&pid!=0) problem = getById(pid);
            else{
                QueryWrapper<Problem> problemQueryWrapper=new QueryWrapper<>();
                problemQueryWrapper.like("title",name);
                problem=this.getOne(problemQueryWrapper);
            }
        }

        if (problem == null) {
            throw new BusinessException("题目不存在或已被删除");
        }
        ProblemVo vo = new ProblemVo(problem);
        List<ProblemExampleVo> examples = problemExampleService.listByProblemId(problem.getId());
        if (examples != null) {
            vo.setExamples(examples);
            if (!examples.isEmpty()) {
                vo.setInputExample(examples.get(0).getInput());
                vo.setOutputExample(examples.get(0).getOutput());
            }
        }
        return vo;
    }

    @Override
    public List<String> getTagNames(Long pid){
        return problemTagService.getTagNames(pid);
    }


    @Override
    public List<ProblemVo> getProblemList(String keyword, Long pid, int offset, int size, boolean ok) {
        return getProblemList(keyword, pid, offset, size, ok, null);
    }

    @Override
    public List<ProblemVo> getProblemList(String keyword, Long pid, int offset, int size, boolean ok, String tag) {
        QueryWrapper<Problem> wrapper = new QueryWrapper<>();
        if (!ok){
            wrapper.eq("open",1);
            wrapper.select("id, title, difficulty, submit_count, pass_count");
        }
        if (StringUtils.isNotBlank(tag)) {
            List<Long> tagPids = problemTagService.getProblemByTag(tag);
            if (tagPids == null || tagPids.isEmpty()) {
                return List.of();
            }
            wrapper.in("id", tagPids);
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
        return getCount(keyword, pid, ok, null);
    }

    @Override
    public Long getCount(String keyword, Long pid, boolean ok, String tag) {
        QueryWrapper<Problem> wrapper = new QueryWrapper<>();
        if (!ok) wrapper.eq("open",1);
        if (StringUtils.isNotBlank(tag)) {
            List<Long> tagPids = problemTagService.getProblemByTag(tag);
            if (tagPids == null || tagPids.isEmpty()) {
                return 0L;
            }
            wrapper.in("id", tagPids);
        }
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

    @Override
    public List<ProblemBasicVo> getAllProblemBasicInfo() {
        LambdaQueryWrapper<Problem> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.select(Problem::getId, Problem::getTitle, Problem::getDifficulty);

        return this.list(queryWrapper).stream()
                .map(problem -> new ProblemBasicVo(problem.getId(), problem.getTitle(), problem.getDifficulty()))
                .collect(Collectors.toList());
    }
}
