package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.CompetitionProblem;

import java.util.List;

public interface CompetitionProblemService {
    List<CompetitionProblem> getProblemList(Long cid);
    void setCount(Long pid, int passCount, int submitCount, Long cid);
    void deleteCompetition(Long id);
    void addRecord(Long pid,Long cid);
    void deleteProblemFromCompetition(Long pid, Long cid);
    void reorderProblems(Long cid, List<Long> problemIds);
}
