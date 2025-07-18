package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.domain.UserSolvedProblem;
import com.example.vnollxonlinejudge.mapper.UserSolvedProblemMapper;
import com.example.vnollxonlinejudge.service.UserSolvedProblemService;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
public class UserSolvedProblemServiceImpl extends ServiceImpl<UserSolvedProblemMapper, UserSolvedProblem> implements UserSolvedProblemService {
    @Override
    public void createUserSolveProblem(long uid, long pid, long cid) {
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
            this.baseMapper.insert(record);
        }
    }

    @Override
    public List<UserSolvedProblem> getSolveProblem(long uid) {
        LambdaQueryWrapper<UserSolvedProblem> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserSolvedProblem::getUserId, uid)
                .eq(UserSolvedProblem::getCompetitionId, 0);
        return this.baseMapper.selectList(wrapper);
    }

    @Override
    public UserSolvedProblem judgeUserIsPass(long pid, long uid, long cid) {
        LambdaQueryWrapper<UserSolvedProblem> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserSolvedProblem::getUserId, uid)
                .eq(UserSolvedProblem::getProblemId, pid)
                .eq(UserSolvedProblem::getCompetitionId, cid);
        return this.baseMapper.selectOne(wrapper);
    }
}
