package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 按日提交量统计
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailySubmissionVO {
    /** 日期 yyyy-MM-dd */
    private String date;
    private Long count;
}
