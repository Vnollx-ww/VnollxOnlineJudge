package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.PracticeProblemMapper;
import com.example.vnollxonlinejudge.model.entity.PracticeProblem;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.service.PracticeProblemService;
import com.example.vnollxonlinejudge.service.ProblemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PracticeProblemServiceImpl extends ServiceImpl<PracticeProblemMapper, PracticeProblem> implements PracticeProblemService {
    
    private final ProblemService problemService;
    
    @Autowired
    public PracticeProblemServiceImpl(ProblemService problemService) {
        this.problemService = problemService;
    }
    
    @Override
    public List<PracticeProblem> getProblemList(Long practiceId) {
        return lambdaQuery()
                .eq(PracticeProblem::getPracticeId, practiceId)
                .orderByAsc(PracticeProblem::getProblemOrder)
                .list();
    }
    
    @Override
    public void addProblems(Long practiceId, List<Long> problemIds) {
        int order = getProblemCount(practiceId);
        for (Long problemId : problemIds) {
            ProblemVo problemVo = problemService.getProblemInfo(problemId, 0L, null);
            if (problemVo == null) {
                throw new BusinessException("题目不存在: " + problemId);
            }
            
            QueryWrapper<PracticeProblem> wrapper = new QueryWrapper<>();
            wrapper.eq("practice_id", practiceId);
            wrapper.eq("problem_id", problemId);
            if (this.count(wrapper) != 0) {
                continue;
            }
            
            PracticeProblem practiceProblem = new PracticeProblem();
            practiceProblem.setPracticeId(practiceId);
            practiceProblem.setProblemId(problemId);
            practiceProblem.setProblemOrder(++order);
            this.save(practiceProblem);
        }
    }
    
    @Override
    public void deleteProblem(Long practiceId, Long problemId) {
        QueryWrapper<PracticeProblem> wrapper = new QueryWrapper<>();
        wrapper.eq("practice_id", practiceId);
        wrapper.eq("problem_id", problemId);
        
        if (this.count(wrapper) == 0) {
            throw new BusinessException("题目不在该练习中");
        }
        
        this.baseMapper.delete(wrapper);
    }
    
    @Override
    public void deleteByPracticeId(Long practiceId) {
        QueryWrapper<PracticeProblem> wrapper = new QueryWrapper<>();
        wrapper.eq("practice_id", practiceId);
        this.baseMapper.delete(wrapper);
    }
    
    @Override
    public Integer getProblemCount(Long practiceId) {
        QueryWrapper<PracticeProblem> wrapper = new QueryWrapper<>();
        wrapper.eq("practice_id", practiceId);
        return Math.toIntExact(this.count(wrapper));
    }
}
