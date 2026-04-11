package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 教学进度 — 按班级拆分时，单个班级的题目通过情况
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeachingProgressClassSliceVO {
    private Long classId;
    private String className;
    /** 该班级学生人数 */
    private Integer studentCount;
    private List<PracticeProgressItemVO> problemProgressList;
}
