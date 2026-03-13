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

    /**
     * 分页查询对话记录（按创建时间降序，用于懒加载）
     * @param userId 用户ID
     * @param beforeId 游标：查询ID小于此值的记录，null表示从最新开始
     * @param limit 每页条数
     * @return 记录列表（按时间降序）
     */
    List<AiChatRecord> listByUserIdBeforeId(Long userId, Long beforeId, int limit);

    /**
     * 获取用户对话记录总数
     */
    long countByUserId(Long userId);

    /**
     * 查询用户在某条记录之后的所有对话记录（按时间升序）
     * @param userId 用户ID
     * @param afterId 查询ID大于此值的记录，null表示查询全部
     * @param limit 最大返回条数
     */
    List<AiChatRecord> listByUserIdAfterId(Long userId, Long afterId, int limit);
}
