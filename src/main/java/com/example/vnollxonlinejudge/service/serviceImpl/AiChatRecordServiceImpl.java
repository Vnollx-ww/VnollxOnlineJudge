package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
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
    public List<AiChatRecord> listByUserIdOrderByCreateTimeAsc(Long userId, int limit) {
        LambdaQueryWrapper<AiChatRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiChatRecord::getUserId, userId)
                .orderByAsc(AiChatRecord::getCreateTime)
                .last("LIMIT " + Math.max(1, Math.min(limit, 200)));
        return aiChatRecordMapper.selectList(wrapper);
    }
}
