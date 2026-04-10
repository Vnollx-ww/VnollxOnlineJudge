package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 教学进度跟踪 - 按练习维度
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeachingProgressVO {
    private Long practiceId;
    private String practiceTitle;
    private Integer totalProblems;
    /** 创建该练习的教师ID */
    private Long creatorId;
    /** 创建该练习的教师姓名 */
    private String creatorName;
    /** 各题目通过人数等进度 */
    private List<PracticeProgressItemVO> problemProgressList;
}
