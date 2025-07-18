package com.example.vnollxonlinejudge.domain;

import jakarta.persistence.*;
import lombok.Data;

@Table(name = "solve")
@Data
public class Solve {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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
