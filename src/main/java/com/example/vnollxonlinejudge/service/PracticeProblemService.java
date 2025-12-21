package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.PracticeProblem;

import java.util.List;

public interface PracticeProblemService {
    List<PracticeProblem> getProblemList(Long practiceId);
    void addProblems(Long practiceId, List<Long> problemIds);
    void deleteProblem(Long practiceId, Long problemId);
    void deleteByPracticeId(Long practiceId);
    Integer getProblemCount(Long practiceId);
}
