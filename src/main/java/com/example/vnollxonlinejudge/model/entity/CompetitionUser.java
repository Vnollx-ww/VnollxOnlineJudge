package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "competition_user")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitionUser {
    @Column(name = "competition_id")
    private Long competitionId;
    @Column(name = "user_id")
    private Long userId;
    @Column(name = "pass_count")
    private Integer passCount;

    @Column(name = "penalty_time")
    private Integer penaltyTime;
    @Column(name = "name")
    private String name;
}
