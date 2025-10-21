package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.entity.CompetitionUser;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import com.example.vnollxonlinejudge.mapper.UserSolvedProblemMapper;
import com.example.vnollxonlinejudge.service.UserSolvedProblemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
public class UserSolvedProblemServiceImpl extends ServiceImpl<UserSolvedProblemMapper, UserSolvedProblem> implements UserSolvedProblemService {
    @Override
    public void createUserSolveProblem(Long uid, Long pid, Long cid,String problemName) {
        LambdaQueryWrapper<UserSolvedProblem> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserSolvedProblem::getUserId, uid)
                .eq(UserSolvedProblem::getProblemId, pid)
                .eq(UserSolvedProblem::getCompetitionId, cid);

        // 先检查是否已存在记录
        if (this.baseMapper.selectCount(wrapper) == 0) {
            UserSolvedProblem record = new UserSolvedProblem();
            record.setUserId(uid);
            record.setProblemId(pid);
            record.setCompetitionId(cid);
            record.setProblemName(problemName);
            this.save(record);
        }
    }

    @Override
    public List<UserSolvedProblem> getSolveProblem(Long uid) {
        LambdaQueryWrapper<UserSolvedProblem> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserSolvedProblem::getUserId, uid)
                .eq(UserSolvedProblem::getCompetitionId, 0);
        return this.list(wrapper);
    }

    @Override
    public UserSolvedProblem judgeUserIsPass(Long pid, Long uid, Long cid) {
        LambdaQueryWrapper<UserSolvedProblem> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserSolvedProblem::getUserId, uid)
                .eq(UserSolvedProblem::getProblemId, pid)
                .eq(UserSolvedProblem::getCompetitionId, cid);
        return this.getOne(wrapper);
    }

    @Override
    public void deleteCompetition(Long cid) {
        QueryWrapper<UserSolvedProblem> wrapper=new QueryWrapper<>();
        wrapper.eq("competition_id",cid);
        this.remove(wrapper);
    }
}
