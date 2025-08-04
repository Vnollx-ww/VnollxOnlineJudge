package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.entity.Competition;
import com.example.vnollxonlinejudge.model.entity.CompetitionUser;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.CompetitionUserMapper;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.CompetitionUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
public class CompetitionUserServiceImpl extends ServiceImpl<CompetitionUserMapper, CompetitionUser> implements CompetitionUserService {
    @Autowired
    private CompetitionService competitionService;
    @Override
    public List<CompetitionUser> getUserList(Long cid) {
        return lambdaQuery()
                .eq(CompetitionUser::getCompetitionId, cid)
                .list();
    }

    @Override
    public CompetitionUser getUser(Long cid, Long uid) {
        return lambdaQuery()
                .eq(CompetitionUser::getCompetitionId, cid)
                .eq(CompetitionUser::getUserId, uid)
                .one();
    }

    @Override
    public void updatePassCount(String name, int ok) {
        update(new LambdaUpdateWrapper<CompetitionUser>()
                .setSql("pass_count = pass_count + " + ok)
                .eq(CompetitionUser::getName, name));
    }

    @Override
    public void updatePenaltyTime(String name, long cid, int time) {
        update(new LambdaUpdateWrapper<CompetitionUser>()
                .setSql("penalty_time = penalty_time + " + time)
                .eq(CompetitionUser::getName, name)
                .eq(CompetitionUser::getCompetitionId, cid));
    }


    @Override
    public void createRecord(long cid, long uid, String name) {
        CompetitionUser record = new CompetitionUser();
        record.setPassCount(0);
        record.setName(name);
        record.setPenaltyTime(0);
        record.setCompetitionId(cid);
        record.setUserId(uid);
        save(record);
        competitionService.addNumber(cid);
    }

    @Override
    public void deleteCompetiton(long id) {
        QueryWrapper<CompetitionUser> wrapper=new QueryWrapper<>();
        wrapper.eq("competition_id",id);
        this.baseMapper.delete(wrapper);
    }
}
