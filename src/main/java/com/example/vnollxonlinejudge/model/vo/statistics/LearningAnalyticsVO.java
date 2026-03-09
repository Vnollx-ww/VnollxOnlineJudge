package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 学习数据分析 - 用户维度
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningAnalyticsVO {
    /** 用户ID */
    private Long userId;
    /** 用户名 */
    private String userName;
    /** 通过题数（AC 题目数） */
    private Long totalSolved;
    /** 总提交次数 */
    private Long totalSubmit;
    /** 通过率 [0,100] */
    private Double passRate;
    /** 近 N 天每日提交量 */
    private List<DailySubmissionVO> dailySubmissions;
    /** 已通过题目简要列表（题号、标题、难度） */
    private List<SolvedProblemItemVO> solvedProblems;
}
