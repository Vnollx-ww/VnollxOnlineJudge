package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.entity.CompetitionUser;
import com.example.vnollxonlinejudge.mapper.CompetitionUserMapper;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.CompetitionUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
public class CompetitionUserServiceImpl extends ServiceImpl<CompetitionUserMapper, CompetitionUser> implements CompetitionUserService {
    private final CompetitionService competitionService;

    @Autowired
    public CompetitionUserServiceImpl(@Lazy CompetitionService competitionService) {
        this.competitionService=competitionService;
    }
    @Override
    public List<CompetitionUser> getUserList(Long cid) {
        return lambdaQuery()
                .eq(CompetitionUser::getCompetitionId, cid)
                .list();
    }
    @Override
    public void updatePassCount(String name, int ok) {
        update(new LambdaUpdateWrapper<CompetitionUser>()
                .setSql("pass_count = pass_count + " + ok)
                .eq(CompetitionUser::getName, name));
    }

    @Override
    public void updatePenaltyTime(String name, Long cid, int time) {
        update(new LambdaUpdateWrapper<CompetitionUser>()
                .setSql("penalty_time = penalty_time + " + time)
                .eq(CompetitionUser::getName, name)
                .eq(CompetitionUser::getCompetitionId, cid));
    }


    @Override
    public void createRecord(Long cid, Long uid, String name) {
        try {
            CompetitionUser record = new CompetitionUser();
            record.setPassCount(0);
            record.setName(name);
            record.setPenaltyTime(0);
            record.setCompetitionId(cid);
            record.setUserId(uid);
            save(record);
            competitionService.addNumber(cid);
        } catch (DuplicateKeyException e) {
            // 记录已存在，忽略异常（用户之前已参加过该比赛）
            // 这是正常情况，不需要抛出异常
        }
    }

    @Override
    public void deleteCompetition(Long id) {
        QueryWrapper<CompetitionUser> wrapper=new QueryWrapper<>();
        wrapper.eq("competition_id",id);
        this.baseMapper.delete(wrapper);
    }
}
