package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.AiChatSummary;

/**
 * AI 对话摘要服务
 */
public interface AiChatSummaryService {
    /**
     * 获取用户最新的对话摘要
     */
    AiChatSummary getLatestByUserId(Long userId);

    /**
     * 保存或更新摘要
     */
    void saveOrUpdate(AiChatSummary summary);

    /**
     * 删除用户的所有摘要（清空记忆时调用）
     */
    void deleteByUserId(Long userId);
}
