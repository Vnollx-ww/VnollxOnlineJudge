package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;

import java.util.List;

public interface CompetitionService {
    CompetitionVo getCompetitionById(Long id);

    void createCompetition(String title,String description,String beginTime,String endTime,String password,boolean needPassword);
    void updateCompetition(Long id,String title,String description,String beginTime,String endTime,String password,boolean needPassword);
    List<CompetitionVo> getCompetitionList(int pageNum, int pageSize, String keyword);
    Long getCount(String keyword);
    void confirmPassword(Long id,String password);

    List<ProblemVo> getProblemList(Long cid);
    List<UserVo> getUserList(Long cid);
    void judgeIsOpenById(String now, Long id);
    void judgeIsEndById(String now,Long id);
    void deleteCompetition(Long id);
    void addNumber(Long id);
    Long getCompetitionCount();
}
