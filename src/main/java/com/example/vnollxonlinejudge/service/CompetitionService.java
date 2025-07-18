package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.domain.Competition;
import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.domain.User;

import java.util.List;

public interface CompetitionService {
    Competition getCompetitionById(long id);

    void createCompetition(String title,String description,String begin_time,String end_time,String password);
    List<Competition> getCompetitionList();
    void confirmPassword(Long id,String password);

    List<Problem> getProblemList(long cid);
    List<User> getUserList(long cid);
    void judgeIsOpenById(String now, long id);
    void judgeIsEndById(String now,long id);
}
