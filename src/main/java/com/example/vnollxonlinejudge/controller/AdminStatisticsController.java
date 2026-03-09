package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.statistics.ErrorPatternStatVO;
import com.example.vnollxonlinejudge.model.vo.statistics.LearningAnalyticsVO;
import com.example.vnollxonlinejudge.model.vo.statistics.PlatformStatsVO;
import com.example.vnollxonlinejudge.model.vo.statistics.TeachingProgressVO;
import com.example.vnollxonlinejudge.service.StatisticsService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 管理端 - 数据统计：常见错误模式、平台数据分析、学习数据分析、教学进度跟踪
 */
@RestController
@RequestMapping("/admin/statistics")
public class AdminStatisticsController {

    private final StatisticsService statisticsService;

    @Autowired
    public AdminStatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    /**
     * 常见错误模式统计（按提交状态聚合）
     */
    @GetMapping("/error-patterns")
    @RequirePermission(PermissionCode.SYSTEM_MONITOR)
    public Result<List<ErrorPatternStatVO>> getErrorPatterns() {
        return Result.Success(statisticsService.getErrorPatternStats(), "获取成功");
    }

    /**
     * 平台数据分析（总览、每日提交趋势、语言分布）
     * @param days 最近天数，默认 30
     */
    @GetMapping("/platform")
    @RequirePermission(PermissionCode.SYSTEM_MONITOR)
    public Result<PlatformStatsVO> getPlatformStats(@RequestParam(defaultValue = "30") int days) {
        if (days <= 0 || days > 365) {
            days = 30;
        }
        return Result.Success(statisticsService.getPlatformStats(days), "获取成功");
    }

    /**
     * 学习数据分析（某用户的通过数、提交数、通过率、近期提交趋势、已通过题目列表）
     * @param uid 用户ID，不传则使用当前登录用户
     * @param days 近期天数，默认 30
     */
    @GetMapping("/learning")
    @RequirePermission(PermissionCode.SYSTEM_MONITOR)
    public Result<LearningAnalyticsVO> getLearningAnalytics(
            @RequestParam(required = false) Long uid,
            @RequestParam(defaultValue = "30") int days) {
        Long userId = uid != null ? uid : UserContextHolder.getCurrentUserId();
        if (userId == null) {
            return Result.LogicError("请指定用户或登录后查看");
        }
        if (days <= 0 || days > 365) {
            days = 30;
        }
        return Result.Success(statisticsService.getLearningAnalytics(userId, days), "获取成功");
    }

    /**
     * 教学进度跟踪（各练习下题目的通过人数）
     * @param practiceId 练习ID，不传则返回所有练习
     */
    @GetMapping("/teaching-progress")
    @RequirePermission(PermissionCode.SYSTEM_MONITOR)
    public Result<List<TeachingProgressVO>> getTeachingProgress(@RequestParam(required = false) Long practiceId) {
        return Result.Success(statisticsService.getTeachingProgress(practiceId), "获取成功");
    }
}
