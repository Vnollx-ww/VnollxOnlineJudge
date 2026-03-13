package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.AiPlatformMapper;
import com.example.vnollxonlinejudge.model.entity.AiPlatform;
import com.example.vnollxonlinejudge.model.vo.ai.AiPlatformVo;
import com.example.vnollxonlinejudge.service.AiPlatformService;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AiPlatformServiceImpl implements AiPlatformService {
    private final AiPlatformMapper aiPlatformMapper;

    public AiPlatformServiceImpl(AiPlatformMapper aiPlatformMapper) {
        this.aiPlatformMapper = aiPlatformMapper;
    }

    @Override
    public List<AiPlatformVo> listEnabled() {
        LambdaQueryWrapper<AiPlatform> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiPlatform::getStatus, 1).orderByAsc(AiPlatform::getSortOrder);
        return aiPlatformMapper.selectList(wrapper).stream().map(this::toVo).collect(Collectors.toList());
    }

    @Override
    public AiPlatform getById(Long id) {
        AiPlatform platform = aiPlatformMapper.selectById(id);
        if (platform == null) {
            throw new BusinessException("AI 平台不存在");
        }
        return platform;
    }

    @Override
    public AiPlatform getByCode(String code) {
        LambdaQueryWrapper<AiPlatform> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiPlatform::getCode, code);
        AiPlatform platform = aiPlatformMapper.selectOne(wrapper);
        if (platform == null) {
            throw new BusinessException("AI 平台不存在: " + code);
        }
        return platform;
    }

    @Override
    public Map<Long, AiPlatform> getByIds(java.util.Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyMap();
        }
        List<AiPlatform> list = aiPlatformMapper.selectBatchIds(ids);
        return list.stream().collect(Collectors.toMap(AiPlatform::getId, p -> p));
    }

    private AiPlatformVo toVo(AiPlatform e) {
        return AiPlatformVo.builder()
                .id(e.getId())
                .code(e.getCode())
                .name(e.getName())
                .build();
    }
}
