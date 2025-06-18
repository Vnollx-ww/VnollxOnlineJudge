package com.example.vnollxonlinejudge.domain;

import javax.persistence.Column;
import javax.persistence.Table;

@Table(name = "user_solver_problems")
public class User_Solved_Problems {
    public long getUserId() {
        return userId;
    }

    public void setUserId(long userId) {
        this.userId = userId;
    }

    public long getProblemId() {
        return problemId;
    }

    public void setProblemId(long problemId) {
        this.problemId = problemId;
    }
    @Column(name = "user_id")
    private long userId;
    @Column(name = "problem_id")
    private long problemId;

    public long getCompetition_id() {
        return competition_id;
    }

    public void setCompetition_id(long competition_id) {
        this.competition_id = competition_id;
    }

    @Column(name= "competition_id")
    private long competition_id;
}
