package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "submission")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Submission {
    @TableId(type = IdType.AUTO)
    private Long id;

    @Column(name = "cid")
    private Long cid;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "problem_name")
    private String problemName;

    private String status;

    @Column(columnDefinition = "TEXT") // 假设代码内容较长
    private String code;

    @Column(name = "create_time")
    private String createTime;

    private String language;
    private Long time;
    private Long memory;

    @Column(name = "uid")
    private Long uid;

    @Column(name = "team_id")
    private Long teamId;

    @Column(name = "pid")
    private Long pid;
    @Column(name = "snowflake_id")
    private Long snowflakeId;

    @Column(name = "error_info", columnDefinition = "TEXT")
    private String errorInfo;

    /** 评测通过的数据组数（含样例测试） */
    @Column(name = "pass_count")
    private Integer passCount;

    /** 总数据组数 */
    @Column(name = "test_count")
    private Integer testCount;

    /**
     * 入库时记录的"前方等待数"快照。仅在 status='等待评测' 时有意义；
     * 评测开始/结束后值会保留作为历史记录，但不再代表实时位置。
     * 列表查询会基于最新 status='等待评测' 的集合做懒计算覆盖。
     */
    @Column(name = "queue_ahead")
    private Integer queueAhead;
}