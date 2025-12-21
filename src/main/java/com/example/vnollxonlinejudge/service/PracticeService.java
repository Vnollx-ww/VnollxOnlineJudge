package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.vo.practice.PracticeVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;

import java.util.List;

public interface PracticeService {
    void createPractice(String title, String description, Boolean isPublic);
    void updatePractice(Long id, String title, String description, Boolean isPublic);
    void deletePractice(Long id);
    List<PracticeVo> getPracticeList(int pageNum, int pageSize, String keyword);
    List<PracticeVo> getPublicPracticeList(Long userId);
    PracticeVo getPracticeById(Long id, Long userId);
    Long getCount(String keyword);
    List<ProblemVo> getProblemList(Long practiceId, Long userId);
}
