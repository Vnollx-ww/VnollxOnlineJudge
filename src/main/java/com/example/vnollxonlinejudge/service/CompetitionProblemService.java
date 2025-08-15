package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.CompetitionProblem;

import java.util.List;

public interface CompetitionProblemService {
    List<CompetitionProblem> getProblemList(Long cid);
    void updateCount(Long pid,int ok1,int ok2,Long cid);
    void deleteCompetition(Long id);
    void addRecord(Long pid,Long cid);
}
