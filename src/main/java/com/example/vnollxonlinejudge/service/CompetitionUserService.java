package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.CompetitionUser;

import java.util.List;

public interface CompetitionUserService {
    List<CompetitionUser> getUserList(Long cid);
    void createRecord(Long cid,Long uid,String name);
    void finishCompetition(Long cid, Long uid);
    boolean hasFinishedCompetition(Long cid, Long uid);
    void deleteCompetition(Long id);
    /** 用 Redis 当前值覆盖式更新 (cid,name) 的通过数与罚时；用于定时同步与比赛结束同步。 */
    void setStats(Long cid, String name, int passCount, int penaltyTime);
}
