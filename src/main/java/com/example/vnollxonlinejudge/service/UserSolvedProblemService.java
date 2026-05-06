package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;

import java.util.List;
import java.util.Set;

public interface UserSolvedProblemService {
    void createUserSolveProblem(Long uid,Long pid,Long cid,String problemName);
    List<UserSolvedProblem> getSolveProblem(Long uid);
    UserSolvedProblem judgeUserIsPass(Long pid, Long uid, Long cid);

    /** 用户在某场比赛中已通过的题目 id */
    Set<Long> getSolvedProblemIdsInCompetition(Long uid, Long cid);

    void deleteCompetition(Long cid);
}
