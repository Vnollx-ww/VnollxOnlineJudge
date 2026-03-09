package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 常见错误模式统计 - 按提交状态聚合
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ErrorPatternStatVO {
    /** 判题状态（如：答案正确、答案错误、时间超出限制等） */
    private String status;
    /** 该状态下的提交数量 */
    private Long count;
}
