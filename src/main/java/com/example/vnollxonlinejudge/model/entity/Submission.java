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

    @Column(name = "pid")
    private Long pid;
    @Column(name="snow_flake_id")
    private Long snowflakeId;

    @Column(name = "error_info", columnDefinition = "TEXT")
    private String errorInfo;

    /** 评测通过的数据组数（含样例测试） */
    @Column(name = "pass_count")
    private Integer passCount;

    /** 总数据组数 */
    @Column(name = "test_count")
    private Integer testCount;
}