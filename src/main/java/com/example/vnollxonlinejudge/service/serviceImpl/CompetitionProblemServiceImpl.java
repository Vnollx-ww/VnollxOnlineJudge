package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.CompetitionProblemMapper;
import com.example.vnollxonlinejudge.model.entity.CompetitionProblem;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.service.*;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
public class CompetitionProblemServiceImpl  extends ServiceImpl<CompetitionProblemMapper,CompetitionProblem>  implements CompetitionProblemService {
    private final ProblemService problemService;

    @Autowired
    public CompetitionProblemServiceImpl(ProblemService problemService) {
        this.problemService=problemService;
    }
    @Override
    public List<CompetitionProblem> getProblemList(Long cid) {
        return lambdaQuery()
                .eq(CompetitionProblem::getCompetitionId, cid)
                .list();
    }

    @Override
    public void updateCount(Long pid, int ok1, int ok2, Long cid) {
        update(new LambdaUpdateWrapper<CompetitionProblem>()
                .setSql("pass_count = pass_count + " + ok1)
                .setSql("submit_count = submit_count + " + ok2)
                .eq(CompetitionProblem::getProblemId, pid)
                .eq(CompetitionProblem::getCompetitionId, cid));
    }

    @Override
    public void deleteCompetition(Long id) {
        QueryWrapper<CompetitionProblem> wrapper=new QueryWrapper<>();
        wrapper.eq("competition_id",id);
        this.baseMapper.delete(wrapper);
    }

    @Override
    public void addRecord(Long pid, Long cid) {
        ProblemVo problemResponse=problemService.getProblemInfo(pid,0L,null);
        if(problemResponse==null){
            throw new BusinessException("题目不存在");
        }
        QueryWrapper<CompetitionProblem>wrapper=new QueryWrapper<>();
        wrapper.eq("problem_id",pid);
        wrapper.eq("competition_id",cid);
        if (this.count(wrapper)!=0){
            throw new BusinessException("题目已存在于比赛中");
        }
        CompetitionProblem competitionProblem=new CompetitionProblem();
        competitionProblem.setCompetitionId(cid);
        competitionProblem.setProblemId(pid);
        this.save(competitionProblem);
    }

    @Override
    public void deleteProblemFromCompetition(Long pid, Long cid) {
        QueryWrapper<CompetitionProblem> wrapper = new QueryWrapper<>();
        wrapper.eq("problem_id", pid);
        wrapper.eq("competition_id", cid);
        
        if (this.count(wrapper) == 0) {
            throw new BusinessException("题目不在该比赛中");
        }
        
        this.baseMapper.delete(wrapper);
    }
}
