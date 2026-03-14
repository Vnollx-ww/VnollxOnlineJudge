package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryItemVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryPageVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatSessionVo;
import reactor.core.publisher.Flux;

import java.util.List;

public interface AiService {
    /** 使用指定模型对话（推荐，会落库） */
    Flux<String> chat(Long userId, Long modelId, String message);

    Flux<String> chat(Long userId, Long modelId, String sessionId, String message);

    /** 兼容旧版：未传 modelId 时使用第一个可用模型 */
    Flux<String> chat(Long userId, String message);

    Flux<String> chat(Long userId, String sessionId, String message);

    void clearMemory(Long userId);

    AiChatSessionVo createSession(Long userId, String title);

    List<AiChatSessionVo> listSessions(Long userId);

    void deleteSession(Long userId, String sessionId);

    /** 从数据库拉取对话记录，返回结构化列表（含 role、content、modelLogoUrl、timestamp） */
    List<AiChatHistoryItemVo> getMessageHistoryList(Long userId, String sessionId);

    /**
     * 分页查询对话记录（懒加载）
     * @param userId 用户ID
     * @param sessionId 会话ID
     * @param beforeId 游标：查询ID小于此值的记录，null表示首次加载
     * @param limit 每页条数
     * @return 分页结果
     */
    AiChatHistoryPageVo getMessageHistoryPage(Long userId, String sessionId, Long beforeId, int limit);
}
