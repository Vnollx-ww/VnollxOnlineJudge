package com.example.vnollxonlinejudge.domain;

import javax.persistence.*;

@Table(name = "submissions")
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

    public Submission(String code, String language, Long pid, Long cid, Long uid, String createTime) {
        this.code = code;
        this.language = language;
        this.pid = pid;
        this.cid = cid;
        this.uid = uid;
        this.createTime = createTime;
    }

    // Getter/Setter（修正驼峰命名）
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCid() { return cid; }
    public void setCid(Long cid) { this.cid = cid; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getProblemName() { return problemName; }
    public void setProblemName(String problemName) { this.problemName = problemName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getCreateTime() { return createTime; }
    public void setCreateTime(String createTime) { this.createTime = createTime; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public int getTime() { return time; }
    public void setTime(int time) { this.time = time; }

    public Long getUid() { return uid; }
    public void setUid(Long uid) { this.uid = uid; }

    public Long getPid() { return pid; }
    public void setPid(Long pid) { this.pid = pid; }
}