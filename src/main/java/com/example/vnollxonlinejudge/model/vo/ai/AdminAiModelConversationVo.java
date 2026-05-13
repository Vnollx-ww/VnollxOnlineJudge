package com.example.vnollxonlinejudge.model.vo.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAiModelConversationVo {
    private Long modelId;
    private Integer userCount;
    private Integer sessionCount;
    private Integer recordCount;
    private List<UserGroup> users;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserGroup {
        private Long userId;
        private String userName;
        private String email;
        private String avatar;
        private Integer sessionCount;
        private Integer recordCount;
        private Long lastActiveAt;
        private List<SessionGroup> sessions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionGroup {
        private String sessionId;
        private String title;
        private Integer recordCount;
        private Long lastActiveAt;
        private List<RecordItem> records;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecordItem {
        private Long id;
        private String userMessage;
        private String modelReply;
        private String thinkingContent;
        private Integer promptTokens;
        private Integer completionTokens;
        private Integer totalTokens;
        private Integer latencyMs;
        private String status;
        private String errorMessage;
        private Long createTime;
        private Long replyTime;
    }
}
