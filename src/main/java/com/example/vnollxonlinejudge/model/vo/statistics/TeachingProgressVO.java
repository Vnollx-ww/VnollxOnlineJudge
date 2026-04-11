package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 教学进度跟踪 - 按练习维度，可选按班级拆分或指定班级筛选
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
    /**
     * 统计维度：all=全站通过人数；by_class=按练习可见班级拆分；class=仅统计某班级学生
     */
    private String dimension;
    /** dimension=class 时生效：筛选的班级 ID */
    private Long filterClassId;
    /** 全站或「指定班级」时的各题通过人数 */
    private List<PracticeProgressItemVO> problemProgressList;
    /** dimension=by_class 时：每个可见班级一条 */
    private List<TeachingProgressClassSliceVO> classSlices;
}
