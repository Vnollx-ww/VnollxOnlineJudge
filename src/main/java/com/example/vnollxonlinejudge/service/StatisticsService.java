package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.vo.statistics.ErrorPatternStatVO;
import com.example.vnollxonlinejudge.model.vo.statistics.LearningAnalyticsVO;
import com.example.vnollxonlinejudge.model.vo.statistics.PlatformStatsVO;
import com.example.vnollxonlinejudge.model.vo.statistics.AiLearningContextVO;
import com.example.vnollxonlinejudge.model.vo.statistics.StudentClassBriefVO;
import com.example.vnollxonlinejudge.model.vo.statistics.TeachingProgressVO;

import java.util.List;
import java.util.Map;

/**
 * 统计数据服务：常见错误模式、平台数据分析、学习数据分析、教学进度跟踪
 */
public interface StatisticsService {

    /**
     * 常见错误模式统计：按提交状态聚合
     */
    List<ErrorPatternStatVO> getErrorPatternStats();

    /**
     * 平台数据分析：总览 + 每日提交趋势 + 语言分布
     * @param days 最近多少天的每日提交数据，默认 30
     */
    PlatformStatsVO getPlatformStats(int days);

    /**
     * 学习数据分析：某用户的通过数、提交数、通过率、近期每日提交、已通过题目列表
     * 教师只能查看自己班级内学生的数据
     */
    LearningAnalyticsVO getLearningAnalytics(Long userId, int days, Long currentUserId, String currentIdentity);

    /**
     * 教学进度跟踪：所有练习（或指定练习）下各题目的通过人数
     * 教师只能看到自己创建的练习、自己班级的统计
     */
    List<TeachingProgressVO> getTeachingProgress(Long practiceId, String dimension, Long filterClassId,
                                                  Long currentUserId, String currentIdentity);

    /**
     * 教学进度筛选「指定班级」时下拉数据
     * 教师只能看到自己的班级
     */
    List<StudentClassBriefVO> listStudentClassesForStats(Long currentUserId, String currentIdentity);

    /**
     * 获取当前用户可查看的学生列表（教师仅返回自己班级内的学生，管理员返回所有学生）
     */
    List<Map<String, Object>> listAccessibleStudents(Long currentUserId, String currentIdentity);

    /**
     * AI 学习建议上下文：聚合用户的做题、错题、练习进度数据，供 AI 生成个性化学习建议
     * @param userId 用户ID
     */
    AiLearningContextVO getAiLearningContext(Long userId);
}
