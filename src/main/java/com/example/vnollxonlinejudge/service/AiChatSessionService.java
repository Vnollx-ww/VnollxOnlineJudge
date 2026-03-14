package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.AiChatSession;

import java.time.LocalDateTime;
import java.util.List;

public interface AiChatSessionService {
    AiChatSession createSession(Long userId, String title);

    List<AiChatSession> listByUserId(Long userId);

    AiChatSession getByIdAndUserId(Long userId, String sessionId);

    AiChatSession getLatestByUserId(Long userId);

    void touchSessionOnMessage(Long userId, String sessionId, Long modelId, String userMessage, LocalDateTime messageTime);

    void deleteByUserIdAndSessionId(Long userId, String sessionId);
}
