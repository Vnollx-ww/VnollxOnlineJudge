package com.example.vnollxonlinejudge.model.vo.competition;

import com.example.vnollxonlinejudge.model.entity.CompetitionAntiCheatSummary;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Data
@NoArgsConstructor
public class AntiCheatSummaryVo {
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private Long id;
    private Long competitionId;
    private Long userId;
    private String username;
    private Integer totalScore;
    private String riskLevel;
    private Integer eventCount;
    private Integer leaveCount;
    private Integer leaveTotalSeconds;
    private Integer fullscreenExitCount;
    private Integer pasteCount;
    private String lastEventAt;
    private String reviewStatus;
    private String reviewResult;
    private Long reviewerId;
    private String reviewNote;
    private String reviewedAt;

    public AntiCheatSummaryVo(CompetitionAntiCheatSummary s) {
        this.id = s.getId();
        this.competitionId = s.getCompetitionId();
        this.userId = s.getUserId();
        this.username = s.getUsername();
        this.totalScore = s.getTotalScore();
        this.riskLevel = s.getRiskLevel();
        this.eventCount = s.getEventCount();
        this.leaveCount = s.getLeaveCount();
        this.leaveTotalSeconds = s.getLeaveTotalSeconds();
        this.fullscreenExitCount = s.getFullscreenExitCount();
        this.pasteCount = s.getPasteCount();
        this.lastEventAt = s.getLastEventAt() == null ? null : s.getLastEventAt().format(FMT);
        this.reviewStatus = s.getReviewStatus();
        this.reviewResult = s.getReviewResult();
        this.reviewerId = s.getReviewerId();
        this.reviewNote = s.getReviewNote();
        this.reviewedAt = s.getReviewedAt() == null ? null : s.getReviewedAt().format(FMT);
    }
}
