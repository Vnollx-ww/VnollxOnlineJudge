package com.example.vnollxonlinejudge.model.dto.competition;

import lombok.Data;

import java.util.List;

/**
 * 比赛防作弊事件批量上报 DTO
 */
@Data
public class AntiCheatReportDTO {
    private Long competitionId;
    private List<EventItem> events;

    @Data
    public static class EventItem {
        private Long problemId;
        private String eventType;
        private String startedAt;
        private String endedAt;
        private Integer durationSeconds;
        private Long submissionId;
        /** 由前端附加的轻量上下文（页面路径、粘贴长度、语言等），后端按需保存 */
        private String detailJson;
    }
}
