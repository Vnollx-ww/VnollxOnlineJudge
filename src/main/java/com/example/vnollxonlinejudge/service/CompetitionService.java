package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.utils.Result;

public interface CompetitionService {
    Result getCompetitionById(long id);

    Result createCompetition(String title,String description,String begin_time,String end_time,String password);
    Result getCompetitionList();
    Result confirmPassword(Long id,String password);

    Result getProblemList(long cid);
    Result getUserList(long cid);
    Result judgeIsOpenById(String now, long id);
    Result judgeIsEndById(String now,long id);
    void addUserRecord(long cid, long uid, String uname);
}
