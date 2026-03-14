package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.example.vnollxonlinejudge.mapper.AiChatRecordMapper;
import com.example.vnollxonlinejudge.model.entity.AiChatRecord;
import com.example.vnollxonlinejudge.service.AiChatRecordService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AiChatRecordServiceImpl implements AiChatRecordService {
    private final AiChatRecordMapper aiChatRecordMapper;

    public AiChatRecordServiceImpl(AiChatRecordMapper aiChatRecordMapper) {
        this.aiChatRecordMapper = aiChatRecordMapper;
    }

    @Override
    public void save(AiChatRecord record) {
        aiChatRecordMapper.insert(record);
    }

    @Override
    public List<AiChatRecord> listBySessionIdOrderByCreateTimeAsc(Long userId, String sessionId, int limit) {
        LambdaQueryWrapper<AiChatRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiChatRecord::getUserId, userId)
                .eq(AiChatRecord::getSessionId, sessionId)
                .orderByAsc(AiChatRecord::getCreateTime)
                .last("LIMIT " + Math.max(1, Math.min(limit, 200)));
        return aiChatRecordMapper.selectList(wrapper);
    }

    @Override
    public List<AiChatRecord> listBySessionIdBeforeId(Long userId, String sessionId, Long beforeId, int limit) {
        LambdaQueryWrapper<AiChatRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiChatRecord::getUserId, userId)
                .eq(AiChatRecord::getSessionId, sessionId);
        if (beforeId != null) {
            wrapper.lt(AiChatRecord::getId, beforeId);
        }
        wrapper.orderByDesc(AiChatRecord::getId)
                .last("LIMIT " + Math.max(1, Math.min(limit, 50)));
        return aiChatRecordMapper.selectList(wrapper);
    }

    @Override
    public long countBySessionId(Long userId, String sessionId) {
        LambdaQueryWrapper<AiChatRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiChatRecord::getUserId, userId)
                .eq(AiChatRecord::getSessionId, sessionId);
        return aiChatRecordMapper.selectCount(wrapper);
    }

    @Override
    public List<AiChatRecord> listBySessionIdAfterId(Long userId, String sessionId, Long afterId, int limit) {
        LambdaQueryWrapper<AiChatRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiChatRecord::getUserId, userId)
                .eq(AiChatRecord::getSessionId, sessionId)
                .eq(AiChatRecord::getStatus, "success");
        if (afterId != null) {
            wrapper.gt(AiChatRecord::getId, afterId);
        }
        wrapper.orderByDesc(AiChatRecord::getId)
                .last("LIMIT " + Math.max(1, Math.min(limit, 50)));
        return aiChatRecordMapper.selectList(wrapper);
    }

    @Override
    public void deleteBySessionId(Long userId, String sessionId) {
        aiChatRecordMapper.delete(
                new LambdaQueryWrapper<AiChatRecord>()
                        .eq(AiChatRecord::getUserId, userId)
                        .eq(AiChatRecord::getSessionId, sessionId)
        );
    }

    @Override
    public boolean hasLegacyRecords(Long userId) {
        return aiChatRecordMapper.selectCount(
                new LambdaQueryWrapper<AiChatRecord>()
                        .eq(AiChatRecord::getUserId, userId)
                        .isNull(AiChatRecord::getSessionId)
        ) > 0;
    }

    @Override
    public void assignLegacyRecordsToSession(Long userId, String sessionId) {
        aiChatRecordMapper.update(
                null,
                new LambdaUpdateWrapper<AiChatRecord>()
                        .eq(AiChatRecord::getUserId, userId)
                        .isNull(AiChatRecord::getSessionId)
                        .set(AiChatRecord::getSessionId, sessionId)
        );
    }
}
