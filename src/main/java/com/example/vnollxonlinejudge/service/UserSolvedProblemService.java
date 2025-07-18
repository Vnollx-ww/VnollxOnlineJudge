package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.domain.UserSolvedProblem;

import java.util.List;

public interface UserSolvedProblemService {
    void createUserSolveProblem(long uid,long pid,long cid);
    List<UserSolvedProblem> getSolveProblem(long uid);
    UserSolvedProblem judgeUserIsPass(long pid, long uid, long cid);
}
