package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 已通过题目简要信息（学习分析用）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SolvedProblemItemVO {
    private Long problemId;
    private String title;
    private String difficulty;
    private List<String> tags;
}
