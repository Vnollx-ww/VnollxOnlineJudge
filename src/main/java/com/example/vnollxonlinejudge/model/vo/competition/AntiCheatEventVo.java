package com.example.vnollxonlinejudge.model.vo.competition;

import com.example.vnollxonlinejudge.model.entity.CompetitionAntiCheatEvent;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Data
@NoArgsConstructor
public class AntiCheatEventVo {
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private Long id;
    private Long competitionId;
    private Long problemId;
    private Long userId;
    private String username;
    private String eventType;
    private String riskLevel;
    private Integer riskScore;
    private String startedAt;
    private String endedAt;
    private Integer durationSeconds;
    private Long submissionId;
    private String detailJson;
    private String ipAddress;
    private String userAgent;
    private String createdAt;

    public AntiCheatEventVo(CompetitionAntiCheatEvent e) {
        this.id = e.getId();
        this.competitionId = e.getCompetitionId();
        this.problemId = e.getProblemId();
        this.userId = e.getUserId();
        this.username = e.getUsername();
        this.eventType = e.getEventType();
        this.riskLevel = e.getRiskLevel();
        this.riskScore = e.getRiskScore();
        this.startedAt = e.getStartedAt();
        this.endedAt = e.getEndedAt();
        this.durationSeconds = e.getDurationSeconds();
        this.submissionId = e.getSubmissionId();
        this.detailJson = e.getDetailJson();
        this.ipAddress = e.getIpAddress();
        this.userAgent = e.getUserAgent();
        this.createdAt = e.getCreatedAt() == null ? null : e.getCreatedAt().format(FMT);
    }
}
