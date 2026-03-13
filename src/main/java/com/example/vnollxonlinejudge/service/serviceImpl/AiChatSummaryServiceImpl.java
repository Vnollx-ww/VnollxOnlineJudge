package com.example.vnollxonlinejudge.service.serviceImpl;

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
    public AiChatSummary getLatestByUserId(Long userId) {
        return aiChatSummaryMapper.selectOne(
                new LambdaQueryWrapper<AiChatSummary>()
                        .eq(AiChatSummary::getUserId, userId)
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
}
