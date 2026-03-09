package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.vo.statistics.ErrorPatternStatVO;
import com.example.vnollxonlinejudge.model.vo.statistics.LearningAnalyticsVO;
import com.example.vnollxonlinejudge.model.vo.statistics.PlatformStatsVO;
import com.example.vnollxonlinejudge.model.vo.statistics.TeachingProgressVO;

import java.util.List;

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
     * @param userId 用户ID，为空则用当前登录用户
     * @param days 近期天数
     */
    LearningAnalyticsVO getLearningAnalytics(Long userId, int days);

    /**
     * 教学进度跟踪：所有练习（或指定练习）下各题目的通过人数
     * @param practiceId 练习ID，为空则返回所有练习的进度
     */
    List<TeachingProgressVO> getTeachingProgress(Long practiceId);
}
