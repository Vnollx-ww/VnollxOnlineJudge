package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 平台数据分析汇总
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformStatsVO {
    /** 总题目数 */
    private Long problemCount;
    /** 总用户数 */
    private Long userCount;
    /** 总提交数 */
    private Long submissionCount;
    /** 总比赛数 */
    private Long competitionCount;
    /** 近 N 天每日提交量 */
    private List<DailySubmissionVO> dailySubmissions;
    /** 语言分布 */
    private List<LanguageStatVO> languageDistribution;
}
