package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.AiChatSummary;

/**
 * AI 对话摘要服务
 */
public interface AiChatSummaryService {
    /**
     * 获取用户最新的对话摘要
     */
    AiChatSummary getLatestByUserIdAndSessionId(Long userId, String sessionId);

    /**
     * 保存或更新摘要
     */
    void saveOrUpdate(AiChatSummary summary);

    /**
     * 删除用户的所有摘要（清空记忆时调用）
     */
    void deleteByUserId(Long userId);

    /**
     * 删除某个会话的摘要
     */
    void deleteByUserIdAndSessionId(Long userId, String sessionId);

    /**
     * 将旧版无 session_id 的摘要迁移到指定会话
     */
    void assignLegacySummariesToSession(Long userId, String sessionId);
}
