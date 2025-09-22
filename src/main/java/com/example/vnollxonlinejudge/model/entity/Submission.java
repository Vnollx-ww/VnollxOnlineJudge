package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Data;

@Table(name = "submission")
@Data
@Builder
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


}