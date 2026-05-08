package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.CompetitionUser;

import java.util.List;

public interface CompetitionUserService {
    List<CompetitionUser> getUserList(Long cid);
    void updatePassCount(String name,int ok);
    void updatePenaltyTime(String name,Long cid,int time);
    void createRecord(Long cid,Long uid,String name);
    void finishCompetition(Long cid, Long uid);
    boolean hasFinishedCompetition(Long cid, Long uid);
    void deleteCompetition(Long id);
}
