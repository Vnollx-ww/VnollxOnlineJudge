package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.vnollxonlinejudge.mapper.AiChatSummaryMapper;
import com.example.vnollxonlinejudge.model.entity.AiChatSummary;
import com.example.vnollxonlinejudge.service.AiChatSummaryService;
import org.springframework.stereotype.Service;

@Service
public class AiChatSummaryServiceImpl implements AiChatSummaryService {

    private final AiChatSummaryMapper aiChatSummaryMapper;

    public AiChatSummaryServiceImpl(AiChatSummaryMapper aiChatSummaryMapper) {
        this.aiChatSummaryMapper = aiChatSummaryMapper;
    }

    @Override
    public AiChatSummary getLatestByUserIdAndSessionId(Long userId, String sessionId) {
        return aiChatSummaryMapper.selectOne(
                new LambdaQueryWrapper<AiChatSummary>()
                        .eq(AiChatSummary::getUserId, userId)
                        .eq(AiChatSummary::getSessionId, sessionId)
                        .orderByDesc(AiChatSummary::getId)
                        .last("LIMIT 1")
        );
    }

    @Override
    public void saveOrUpdate(AiChatSummary summary) {
        if (summary.getId() != null) {
            aiChatSummaryMapper.updateById(summary);
        } else {
            aiChatSummaryMapper.insert(summary);
        }
    }

    @Override
    public void deleteByUserId(Long userId) {
        aiChatSummaryMapper.delete(
                new LambdaQueryWrapper<AiChatSummary>()
                        .eq(AiChatSummary::getUserId, userId)
        );
    }

    @Override
    public void deleteByUserIdAndSessionId(Long userId, String sessionId) {
        aiChatSummaryMapper.delete(
                new LambdaQueryWrapper<AiChatSummary>()
                        .eq(AiChatSummary::getUserId, userId)
                        .eq(AiChatSummary::getSessionId, sessionId)
        );
    }

    @Override
    public void assignLegacySummariesToSession(Long userId, String sessionId) {
        aiChatSummaryMapper.update(
                null,
                new LambdaUpdateWrapper<AiChatSummary>()
                        .eq(AiChatSummary::getUserId, userId)
                        .isNull(AiChatSummary::getSessionId)
                        .set(AiChatSummary::getSessionId, sessionId)
        );
    }
}
