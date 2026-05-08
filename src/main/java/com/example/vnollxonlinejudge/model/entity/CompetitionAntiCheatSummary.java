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

@Table(name = "competition_anti_cheat_summary")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitionAntiCheatSummary {
    @TableId(type = IdType.AUTO)
    private Long id;

    @Column(name = "competition_id")
    private Long competitionId;

    @Column(name = "user_id")
    private Long userId;

    private String username;

    @Column(name = "total_score")
    private Integer totalScore;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "event_count")
    private Integer eventCount;

    @Column(name = "leave_count")
    private Integer leaveCount;

    @Column(name = "leave_total_seconds")
    private Integer leaveTotalSeconds;

    @Column(name = "fullscreen_exit_count")
    private Integer fullscreenExitCount;

    @Column(name = "paste_count")
    private Integer pasteCount;

    @Column(name = "last_event_at")
    private LocalDateTime lastEventAt;

    @Column(name = "review_status")
    private String reviewStatus;

    @Column(name = "review_result")
    private String reviewResult;

    @Column(name = "reviewer_id")
    private Long reviewerId;

    @Column(name = "review_note")
    private String reviewNote;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
