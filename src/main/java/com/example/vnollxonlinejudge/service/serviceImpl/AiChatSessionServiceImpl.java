package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.vnollxonlinejudge.mapper.AiChatSessionMapper;
import com.example.vnollxonlinejudge.model.entity.AiChatSession;
import com.example.vnollxonlinejudge.service.AiChatSessionService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AiChatSessionServiceImpl implements AiChatSessionService {
    private static final String DEFAULT_TITLE = "新会话";

    private final AiChatSessionMapper aiChatSessionMapper;

    public AiChatSessionServiceImpl(AiChatSessionMapper aiChatSessionMapper) {
        this.aiChatSessionMapper = aiChatSessionMapper;
    }

    @Override
    public AiChatSession createSession(Long userId, String title) {
        LocalDateTime now = LocalDateTime.now();
        AiChatSession session = AiChatSession.builder()
                .id(UUID.randomUUID().toString().replace("-", ""))
                .userId(userId)
                .title(normalizeTitle(title))
                .messageCount(0)
                .createTime(now)
                .updateTime(now)
                .build();
        aiChatSessionMapper.insert(session);
        return session;
    }

    @Override
    public List<AiChatSession> listByUserId(Long userId) {
        return aiChatSessionMapper.selectList(
                new LambdaQueryWrapper<AiChatSession>()
                        .eq(AiChatSession::getUserId, userId)
                        .orderByDesc(AiChatSession::getLastMessageAt)
                        .orderByDesc(AiChatSession::getUpdateTime)
                        .orderByDesc(AiChatSession::getCreateTime)
        );
    }

    @Override
    public AiChatSession getByIdAndUserId(Long userId, String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return null;
        }
        return aiChatSessionMapper.selectOne(
                new LambdaQueryWrapper<AiChatSession>()
                        .eq(AiChatSession::getUserId, userId)
                        .eq(AiChatSession::getId, sessionId)
                        .last("LIMIT 1")
        );
    }

    @Override
    public AiChatSession getLatestByUserId(Long userId) {
        return aiChatSessionMapper.selectOne(
                new LambdaQueryWrapper<AiChatSession>()
                        .eq(AiChatSession::getUserId, userId)
                        .orderByDesc(AiChatSession::getLastMessageAt)
                        .orderByDesc(AiChatSession::getUpdateTime)
                        .orderByDesc(AiChatSession::getCreateTime)
                        .last("LIMIT 1")
        );
    }

    @Override
    public void touchSessionOnMessage(Long userId, String sessionId, Long modelId, String userMessage, LocalDateTime messageTime) {
        AiChatSession session = getByIdAndUserId(userId, sessionId);
        if (session == null) {
            return;
        }
        session.setLastModelId(modelId);
        session.setLastMessageAt(messageTime);
        session.setUpdateTime(messageTime);
        session.setMessageCount((session.getMessageCount() == null ? 0 : session.getMessageCount()) + 1);
        if (session.getTitle() == null || session.getTitle().isBlank() || DEFAULT_TITLE.equals(session.getTitle())) {
            session.setTitle(buildTitleFromMessage(userMessage));
        }
        aiChatSessionMapper.updateById(session);
    }

    @Override
    public void deleteByUserIdAndSessionId(Long userId, String sessionId) {
        aiChatSessionMapper.delete(
                new LambdaQueryWrapper<AiChatSession>()
                        .eq(AiChatSession::getUserId, userId)
                        .eq(AiChatSession::getId, sessionId)
        );
    }

    private String normalizeTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            return DEFAULT_TITLE;
        }
        return truncate(title.trim(), 120);
    }

    private String buildTitleFromMessage(String userMessage) {
        if (userMessage == null || userMessage.trim().isEmpty()) {
            return DEFAULT_TITLE;
        }
        return truncate(userMessage.trim().replaceAll("\\s+", " "), 30);
    }

    private String truncate(String text, int maxLength) {
        if (text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + "...";
    }
}
