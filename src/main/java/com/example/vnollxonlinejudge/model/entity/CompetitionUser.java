package com.example.vnollxonlinejudge.model.entity;

import jakarta.persistence.*;
import lombok.Data;

@Table(name = "competition_user")
@Data
public class CompetitionUser {
    @Column(name = "competition_id")
    private long competitionId;
    @Column(name = "user_id")
    private long userId;
    @Column(name = "pass_count")
    private int passCount;

    @Column(name = "penalty_time")
    private int penaltyTime;
    @Column(name = "name")
    private String name;
}
