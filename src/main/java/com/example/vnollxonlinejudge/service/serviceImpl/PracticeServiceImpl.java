package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.PracticeMapper;
import com.example.vnollxonlinejudge.model.entity.Practice;
import com.example.vnollxonlinejudge.model.entity.PracticeProblem;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import com.example.vnollxonlinejudge.model.vo.practice.PracticeVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.service.PracticeProblemService;
import com.example.vnollxonlinejudge.service.PracticeService;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.UserSolvedProblemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PracticeServiceImpl extends ServiceImpl<PracticeMapper, Practice> implements PracticeService {
    
    private final PracticeProblemService practiceProblemService;
    private final ProblemService problemService;
    private final UserSolvedProblemService userSolvedProblemService;
    
    @Autowired
    public PracticeServiceImpl(
            @Lazy PracticeProblemService practiceProblemService,
            ProblemService problemService,
            UserSolvedProblemService userSolvedProblemService
    ) {
        this.practiceProblemService = practiceProblemService;
        this.problemService = problemService;
        this.userSolvedProblemService = userSolvedProblemService;
    }
    
    @Override
    public void createPractice(String title, String description, Boolean isPublic) {
        Practice practice = new Practice();
        practice.setTitle(title);
        practice.setDescription(description);
        practice.setIsPublic(isPublic != null ? isPublic : true);
        practice.setCreateTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        this.save(practice);
    }
    
    @Override
    public void updatePractice(Long id, String title, String description, Boolean isPublic) {
        Practice practice = this.getById(id);
        if (practice == null) {
            throw new BusinessException("练习不存在");
        }
        practice.setTitle(title);
        practice.setDescription(description);
        practice.setIsPublic(isPublic != null ? isPublic : true);
        this.updateById(practice);
    }
    
    @Override
    public void deletePractice(Long id) {
        Practice practice = this.getById(id);
        if (practice == null) {
            throw new BusinessException("练习不存在");
        }
        practiceProblemService.deleteByPracticeId(id);
        this.removeById(id);
    }
    
    @Override
    public List<PracticeVo> getPracticeList(int pageNum, int pageSize, String keyword) {
        QueryWrapper<Practice> wrapper = new QueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.like("title", keyword);
        }
        wrapper.orderByDesc("create_time");
        
        List<Practice> practices;
        if (pageNum > 0 && pageSize > 0) {
            Page<Practice> page = new Page<>(pageNum, pageSize);
            practices = this.page(page, wrapper).getRecords();
        } else {
            practices = this.list(wrapper);
        }
        
        return practices.stream()
                .map(p -> {
                    Integer problemCount = practiceProblemService.getProblemCount(p.getId());
                    return new PracticeVo(p, problemCount, 0);
                })
                .collect(Collectors.toList());
    }
    
    @Override
    public List<PracticeVo> getPublicPracticeList(Long userId) {
        QueryWrapper<Practice> wrapper = new QueryWrapper<>();
        wrapper.eq("is_public", true);
        wrapper.orderByDesc("create_time");
        
        List<Practice> practices = this.list(wrapper);
        
        Set<Long> solvedProblemIds = getSolvedProblemIds(userId);
        
        return practices.stream()
                .map(p -> {
                    List<PracticeProblem> problems = practiceProblemService.getProblemList(p.getId());
                    Integer problemCount = problems.size();
                    Integer solvedCount = 0;
                    if (userId != null && !problems.isEmpty()) {
                        solvedCount = (int) problems.stream()
                                .filter(pp -> solvedProblemIds.contains(pp.getProblemId()))
                                .count();
                    }
                    return new PracticeVo(p, problemCount, solvedCount);
                })
                .collect(Collectors.toList());
    }
    
    @Override
    public PracticeVo getPracticeById(Long id, Long userId) {
        Practice practice = this.getById(id);
        if (practice == null) {
            throw new BusinessException("练习不存在");
        }
        
        List<PracticeProblem> problems = practiceProblemService.getProblemList(id);
        Integer problemCount = problems.size();
        Integer solvedCount = 0;
        
        if (userId != null && !problems.isEmpty()) {
            Set<Long> solvedProblemIds = getSolvedProblemIds(userId);
            solvedCount = (int) problems.stream()
                    .filter(pp -> solvedProblemIds.contains(pp.getProblemId()))
                    .count();
        }
        
        return new PracticeVo(practice, problemCount, solvedCount);
    }
    
    @Override
    public Long getCount(String keyword) {
        QueryWrapper<Practice> wrapper = new QueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.like("title", keyword);
        }
        return this.count(wrapper);
    }
    
    @Override
    public List<ProblemVo> getProblemList(Long practiceId, Long userId) {
        List<PracticeProblem> practiceProblems = practiceProblemService.getProblemList(practiceId);
        
        Set<Long> solvedProblemIds = getSolvedProblemIds(userId);
        
        List<ProblemVo> result = new ArrayList<>();
        for (PracticeProblem pp : practiceProblems) {
            ProblemVo problemVo = problemService.getProblemInfo(pp.getProblemId(), 0L, null);
            if (problemVo != null) {
                problemVo.setIsSolved(solvedProblemIds.contains(pp.getProblemId()));
                result.add(problemVo);
            }
        }
        return result;
    }
    
    private Set<Long> getSolvedProblemIds(Long userId) {
        if (userId == null) {
            return Set.of();
        }
        List<UserSolvedProblem> solvedProblems = userSolvedProblemService.getSolveProblem(userId);
        return solvedProblems.stream()
                .map(UserSolvedProblem::getProblemId)
                .collect(Collectors.toSet());
    }
}
