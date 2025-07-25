package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.Data;

@Table(name = "solve")
@Data
public class Solve {
    @TableId(type = IdType.AUTO)
    private Long  id;
    @Column(name = "problem_name")
    private String problemName;

    @Column(name = "name")
    private String name;
    @Column(name = "content")
    private String content;
    @Column(name = "uid")
    private long uid;

    @Column(name = "pid")
    private long pid;
    @Column(name = "create_time")
    private String createTime;
    @Column(name = "title")
    private String title;
}
