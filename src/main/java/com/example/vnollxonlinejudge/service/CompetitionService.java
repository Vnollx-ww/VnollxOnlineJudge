package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.model.dto.response.competition.CompetitionResponse;
import com.example.vnollxonlinejudge.model.dto.response.problem.ProblemResponse;
import com.example.vnollxonlinejudge.model.dto.response.user.UserResponse;
import com.example.vnollxonlinejudge.model.entity.Competition;
import com.example.vnollxonlinejudge.model.entity.Problem;
import com.example.vnollxonlinejudge.model.entity.User;

import java.util.List;

public interface CompetitionService {
    CompetitionResponse getCompetitionById(long id);

    void createCompetition(String title,String description,String beginTime,String endTime,String password,boolean needPassword);
    void updateCompetition(long id,String title,String description,String beginTime,String endTime,String password,boolean needPassword);
    List<CompetitionResponse> getCompetitionList(int pageNum,int pageSize,String keyword);
    Long getCount(String keyword);
    void confirmPassword(Long id,String password);

    List<ProblemResponse> getProblemList(long cid);
    List<UserResponse> getUserList(long cid);
    Boolean judgeIsOpenById(String now, long id);
    void judgeIsEndById(String now,long id);
    void deleteCompetition(long id);
    void addNumber(long id);
}
