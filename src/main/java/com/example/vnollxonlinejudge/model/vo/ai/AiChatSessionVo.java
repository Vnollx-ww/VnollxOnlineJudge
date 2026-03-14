package com.example.vnollxonlinejudge.model.vo.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AI 会话列表项
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatSessionVo {
    private String id;
    private String title;
    private Long lastModelId;
    private String lastModelLogoUrl;
    private Integer messageCount;
    private String lastMessagePreview;
    private Long lastMessageAt;
    private Long createTime;
}
