package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "competition")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Competition {
    @TableId(type = IdType.AUTO)
    private Long  id;
    @Column(name = "number")
    private Integer number;

    @Column(name = "need_password")
    private Boolean needPassword;

    @Column(name = "title")
    private String title;
    @Column(name = "description")
    private String description;
    @Column(name = "begin_time")
    private String beginTime;
    @Column(name = "end_time")
    private String endTime;
    @Column(name = "password")
    private String password;
}
