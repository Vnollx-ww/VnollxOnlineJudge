package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.entity.CompetitionProblem;
import com.example.vnollxonlinejudge.mapper.CompetitionProblemMapper;
import com.example.vnollxonlinejudge.service.CompetitionProblemService;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
public class CompetitionProblemServiceImpl  extends ServiceImpl<CompetitionProblemMapper,CompetitionProblem>  implements CompetitionProblemService {
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
}
