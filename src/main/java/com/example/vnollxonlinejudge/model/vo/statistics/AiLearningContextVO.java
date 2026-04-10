package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI 学习建议上下文 - 聚合用户做题、错题、练习进度等数据
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiLearningContextVO {
    private Long userId;
    private String userName;
    /** 总提交次数 */
    private Long totalSubmit;
    /** 通过题数 */
    private Long totalSolved;
    /** 通过率 */
    private Double passRate;
    /** 错误类型分布（如 Wrong Answer: 15, Compile Error: 8 等） */
    private List<ErrorPatternStatVO> errorPatterns;
    /** 最近错误提交摘要（题号、题名、错误状态） */
    private List<RecentErrorItem> recentErrors;
    /** 已通过题目（含难度和标签） */
    private List<SolvedProblemItemVO> solvedProblems;
    /** 练习完成进度 */
    private List<PracticeProgressSummary> practiceProgress;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentErrorItem {
        private Long problemId;
        private String problemName;
        private String status;
        private String language;
        private String createTime;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PracticeProgressSummary {
        private Long practiceId;
        private String practiceTitle;
        private Integer totalProblems;
        private Integer solvedCount;
        private String creatorName;
    }
}
