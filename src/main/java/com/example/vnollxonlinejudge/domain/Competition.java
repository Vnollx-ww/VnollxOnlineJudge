package com.example.vnollxonlinejudge.domain;

import jakarta.persistence.*;
import lombok.Data;

@Table(name = "competition")
@Data
public class Competition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long  id;
    @Column(name = "number")
    private int number;

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
