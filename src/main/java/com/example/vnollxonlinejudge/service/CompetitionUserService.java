package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.CompetitionUser;

import java.util.List;

public interface CompetitionUserService {
    List<CompetitionUser> getUserList(Long cid);
    CompetitionUser getUser(Long cid, Long uid);
    void updatePassCount(String name,int ok);
    void updatePenaltyTime(String name,long cid,int time);
    void createRecord(long cid,long uid,String name);
    void deleteCompetiton(long id);
}
