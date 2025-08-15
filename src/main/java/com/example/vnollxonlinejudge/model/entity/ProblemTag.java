package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.Data;

@Table(name = "problem_tag")
@Data
public class ProblemTag {
    @Column(name = "problem_id")
    private Long problemId;
    @Column(name = "tag_name")
    private String tagName;


    @Column(name = "create_time")
    private String createTime;

}