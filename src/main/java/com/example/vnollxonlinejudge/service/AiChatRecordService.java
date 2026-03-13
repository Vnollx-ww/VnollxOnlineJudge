package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.AiChatRecord;

import java.util.List;

/**
 * AI 对话记录服务
 */
public interface AiChatRecordService {
    void save(AiChatRecord record);

    /**
     * 按用户ID查询对话记录，按创建时间升序，最多返回 limit 条
     */
    List<AiChatRecord> listByUserIdOrderByCreateTimeAsc(Long userId, int limit);
}
