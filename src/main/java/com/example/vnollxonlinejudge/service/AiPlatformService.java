package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.AiPlatform;
import com.example.vnollxonlinejudge.model.vo.ai.AiPlatformVo;

import java.util.List;
import java.util.Map;

/**
 * AI 平台服务：按平台选择对应 SDK 适配器
 */
public interface AiPlatformService {
    /** 列出所有启用平台（供管理端下拉等） */
    List<AiPlatformVo> listEnabled();

    /** 根据 ID 获取平台实体 */
    AiPlatform getById(Long id);

    /** 根据 code 获取平台实体 */
    AiPlatform getByCode(String code);

    /** 根据 ID 列表批量获取，返回 id -> 实体 */
    Map<Long, AiPlatform> getByIds(java.util.Collection<Long> ids);
}
