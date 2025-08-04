package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.dto.response.problem.ProblemResponse;
import com.example.vnollxonlinejudge.model.entity.CompetitionProblem;
import com.example.vnollxonlinejudge.mapper.CompetitionProblemMapper;
import com.example.vnollxonlinejudge.model.entity.CompetitionUser;
import com.example.vnollxonlinejudge.service.CompetitionProblemService;
import com.example.vnollxonlinejudge.service.ProblemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
public class CompetitionProblemServiceImpl  extends ServiceImpl<CompetitionProblemMapper,CompetitionProblem>  implements CompetitionProblemService {
    @Autowired
    private ProblemService problemService;
    @Override
    public List<CompetitionProblem> getProblemList(Long cid) {
        return lambdaQuery()
                .eq(CompetitionProblem::getCompetitionId, cid)
                .list();
    }

    @Override
    public void updatePassCount(long pid, int ok, long cid) {
        update(new LambdaUpdateWrapper<CompetitionProblem>()
                .setSql("pass_count = pass_count + " + ok)
                .setSql("submit_count = submit_count + 1")
                .eq(CompetitionProblem::getProblemId, pid)
                .eq(CompetitionProblem::getCompetitionId, cid));
    }

    @Override
    public void updateCount(long pid, int ok1, int ok2, long cid) {
        update(new LambdaUpdateWrapper<CompetitionProblem>()
                .setSql("pass_count = pass_count + " + ok1)
                .setSql("submit_count = submit_count + " + ok2)
                .eq(CompetitionProblem::getProblemId, pid)
                .eq(CompetitionProblem::getCompetitionId, cid));
    }

    @Override
    public void deleteCompetition(long id) {
        QueryWrapper<CompetitionProblem> wrapper=new QueryWrapper<>();
        wrapper.eq("competition_id",id);
        this.baseMapper.delete(wrapper);
    }

    @Override
    public void addRecord(long pid, long cid) {
        ProblemResponse problemResponse=problemService.getProblemInfo(pid,0);
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
}
