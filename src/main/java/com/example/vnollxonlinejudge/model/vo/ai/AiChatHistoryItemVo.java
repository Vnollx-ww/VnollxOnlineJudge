package com.example.vnollxonlinejudge.model.vo.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AI 对话历史单条消息（供前端直接展示，含 modelLogoUrl）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatHistoryItemVo {
    /** user | bot */
    private String role;
    private String content;
    /** 仅 bot 时有值，思考过程内容 */
    private String thinkingContent;
    /** 仅 bot 时有值，对应 ai_model.logo_url */
    private String modelLogoUrl;
    /** 时间戳毫秒，便于前端展示 */
    private Long timestamp;
}
