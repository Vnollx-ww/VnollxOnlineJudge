package com.example.vnollxonlinejudge.domain;

import jakarta.persistence.*;
import lombok.Data;

@Table(name = "submission")
@Data
public class Submission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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
    private int time;

    @Column(name = "uid")
    private Long uid;

    @Column(name = "pid")
    private Long pid;

    // 构造方法
    public Submission() {}

    public Submission(String code, String language, Long pid, Long cid, Long uid, String createTime,String userName,String status,int time) {
        this.code = code;
        this.language = language;
        this.pid = pid;
        this.cid = cid;
        this.uid = uid;
        this.createTime = createTime;
        this.userName=userName;
        this.status=status;
        this.time=time;
    }

}