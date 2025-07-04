package com.example.vnollxonlinejudge.domain;

import jakarta.persistence.*;

@Table(name = "users")
@Entity
public class User {
    // 注意属性名要与数据表中的字段名一致
    // 主键自增int(10)对应long
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    public int getPenaltyTime() {
        return penaltyTime;
    }

    public void setPenaltyTime(int penaltyTime) {
        this.penaltyTime = penaltyTime;
    }
    @Column(name = "penalty_time")
    private int penaltyTime;
    @Column(name = "name")
    private String name;
    public String getPassword() {
        return password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Column(name = "password")
    private String password;
    @Column(name = "email")
    private String email;
    @Column(name = "submit_count")
    private int submitCount;

    public int getSubmitCount() {
        return submitCount;
    }

    public void setSubmitCount(int submitCount) {
        this.submitCount = submitCount;
    }

    public int getPassCount() {
        return passCount;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public void setPassCount(int passCount) {
        this.passCount = passCount;
    }
    @Column(name = "pass_count")
    private int passCount;
    @Column(name = "version")
    private int version;
}