package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.Column;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Table(name = "competition_anti_cheat_event")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitionAntiCheatEvent {
    @TableId(type = IdType.AUTO)
    private Long id;

    @Column(name = "competition_id")
    private Long competitionId;

    @Column(name = "problem_id")
    private Long problemId;

    @Column(name = "user_id")
    private Long userId;

    private String username;

    @Column(name = "event_type")
    private String eventType;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "risk_score")
    private Integer riskScore;

    @Column(name = "started_at")
    private String startedAt;

    @Column(name = "ended_at")
    private String endedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "submission_id")
    private Long submissionId;

    @Column(name = "detail_json", columnDefinition = "TEXT")
    private String detailJson;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
