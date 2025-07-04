package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.utils.Result;

public interface ProblemService {
    Result createProblem(String title, String description, int timelimit, int memorylimit, String difficulty, String inputexample, String outputexample, String datazip);

    Result deleteProblem(long id);
    Result updateProblem(long id,String title, String description, int timelimit, int memorylimit, String difficulty, String inputexample, String outputexample, String datazip);

    Result getProblemInfo(long pid,long cid);

    Result submitCodeToProblem(String code,String option,long pid,long uid,long cid,String create_time,String uname);

    Result getProblemList(int offset,int size);
    Result getProblemCount();
    Result getTagNames(long pid);
    Result getProblemListByKeywords(String name, long pid, int offset, int size);

    Result getCountByKeywords(String name, long pid);
    boolean judgeIsSolve(long pid,long uid,long cid);
    void updatePassCount(long pid, int ok);
    void addUserSolveRecord(long pid,long uid,long cid);
}
