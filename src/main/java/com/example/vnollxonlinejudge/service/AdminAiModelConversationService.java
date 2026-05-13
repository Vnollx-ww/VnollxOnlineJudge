package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.vo.ai.AdminAiModelConversationVo;

public interface AdminAiModelConversationService {
    AdminAiModelConversationVo getConversationsByModelId(Long modelId);
}
