package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.CompetitionProblem;

import java.util.List;

public interface CompetitionProblemService {
    List<CompetitionProblem> getProblemList(Long cid);
    void updatePassCount(long pid,int ok,long cid);
    void updateCount(long pid,int ok1,int ok2,long cid);
    void deleteCompetition(long id);
    void addRecord(long pid,long cid);
}
