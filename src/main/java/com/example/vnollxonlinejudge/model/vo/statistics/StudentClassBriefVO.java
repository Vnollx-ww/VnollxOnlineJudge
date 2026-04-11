package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 数据统计下拉用：班级简要信息
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentClassBriefVO {
    private Long id;
    private String className;
}
