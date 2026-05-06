package com.example.vnollxonlinejudge.model.vo.competition;

import lombok.Data;

/**
 * 比赛题单列表项：仅含列表展示所需字段，避免返回题面、样例等大字段。
 */
@Data
public class CompetitionProblemBriefVo {
    private Long id;
    private String title;
    private Integer submitCount;
    private Integer passCount;
    /** 当前登录用户在该比赛中是否已通过 */
    private Boolean isSolved;
}
