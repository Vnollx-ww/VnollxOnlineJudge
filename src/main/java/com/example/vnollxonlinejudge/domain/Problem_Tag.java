package com.example.vnollxonlinejudge.domain;

import jakarta.persistence.*;

@Table(name = "problem_tags")
public class Problem_Tag {
    @Column(name = "problem_id")
    private Long problemId;
    @Column(name = "tag_id")
    private Long tagId;
    @Column(name = "create_time")
    private String createTime;

    public Long getProblemId() {
        return problemId;
    }

    public void setProblemId(Long problemId) {
        this.problemId = problemId;
    }

    public Long getTagId() {
        return tagId;
    }

    public void setTagId(Long tagId) {
        this.tagId = tagId;
    }

    public String getCreateTime() {
        return createTime;
    }

    public void setCreateTime(String createTime) {
        this.createTime = createTime;
    }
}