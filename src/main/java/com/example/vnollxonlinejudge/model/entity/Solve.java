package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "solve")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
    private Long uid;

    @Column(name = "pid")
    private Long pid;
    @Column(name = "create_time")
    private String createTime;
    @Column(name = "title")
    private String title;
    @Column(name = "status")
    private Boolean status;
}
