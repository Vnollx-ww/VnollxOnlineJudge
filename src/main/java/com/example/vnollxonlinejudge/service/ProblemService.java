package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.domain.Problem;

import java.util.List;

public interface ProblemService {
    void createProblem(String title, String description, int timelimit, int memorylimit, String difficulty, String inputexample, String outputexample, String datazip);

    void deleteProblem(long id);
    void updateProblem(long id,String title, String description, int timelimit, int memorylimit, String difficulty, String inputexample, String outputexample, String datazip);

    Problem getProblemInfo(long pid, long cid);

    List<Problem> getProblemList(int offset, int size);
    int getProblemCount();
    List<String> getTagNames(long pid);
    List<Problem> getProblemListByKeywords(String name, long pid, int offset, int size);

    int getCountByKeywords(String name, long pid);
    boolean judgeIsSolve(long pid,long uid,long cid);
    void updatePassCount(long pid, int ok);
    void addUserSolveRecord(long pid,long uid,long cid);
}
