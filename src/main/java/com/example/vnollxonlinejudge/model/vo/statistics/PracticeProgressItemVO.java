package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 练习下某题目的进度（通过人数）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PracticeProgressItemVO {
    private Long problemId;
    private String title;
    /** 通过该题的用户数（去重） */
    private Long solvedCount;
}
