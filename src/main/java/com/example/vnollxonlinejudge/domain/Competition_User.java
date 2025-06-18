package com.example.vnollxonlinejudge.domain;

import javax.persistence.*;

@Table(name = "competition_users")
public class Competition_User {
    @Column(name = "competition_id")
    private long competitionId;
    @Column(name = "user_id")
    private long userId;
    @Column(name = "pass_count")
    private int passCount;

    public long getCompetitionId() {
        return competitionId;
    }

    public void setCompetitionId(long competitionId) {
        this.competitionId = competitionId;
    }

    public long getUserId() {
        return userId;
    }

    public void setUserId(long userId) {
        this.userId = userId;
    }

    public int getPassCount() {
        return passCount;
    }

    public void setPassCount(int passCount) {
        this.passCount = passCount;
    }

    public int getPenaltyTime() {
        return penaltyTime;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setPenaltyTime(int penaltyTime) {
        this.penaltyTime = penaltyTime;
    }
    @Column(name = "penalty_time")
    private int penaltyTime;
    @Column(name = "name")
    private String name;
}
