package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.vo.practice.PracticeVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;

import java.util.List;

public interface PracticeService {
    void createPractice(String title, String description, Boolean isPublic, Long creatorId);
    void updatePractice(Long id, String title, String description, Boolean isPublic);
    void deletePractice(Long id);
    List<PracticeVo> getPracticeList(int pageNum, int pageSize, String keyword);
    List<PracticeVo> getPublicPracticeList(Long userId);
    PracticeVo getPracticeById(Long id, Long userId);
    Long getCount(String keyword);
    List<ProblemVo> getProblemList(Long practiceId, Long userId);
    /** 获取指定教师创建的练习列表（教学计划） */
    List<PracticeVo> getTeacherPractices(Long teacherId, Long studentUserId);
    /** 获取学生在所有公开练习中的完成进度 */
    List<PracticeVo> getStudentPracticeProgress(Long userId);
}
