package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.admin.AdminAiModelSaveDTO;
import com.example.vnollxonlinejudge.model.entity.AiModel;
import com.example.vnollxonlinejudge.model.vo.ai.AiModelVo;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;

import java.util.List;

/**
 * AI 模型配置服务
 */
public interface AiModelService {
    /** 获取所有启用模型（供用户选择） */
    List<AiModelVo> listEnabled();

    /** 管理后台：分页或列表 */
    List<AiModelVo> listAll();

    /** 根据 ID 获取实体（内部用，含 apiKey） */
    AiModel getById(Long id);

    /** 根据配置构建流式聊天模型 */
    StreamingChatLanguageModel buildStreamingModel(AiModel model);

    /** 创建 */
    Long create(AdminAiModelSaveDTO dto);

    /** 更新 */
    void update(AdminAiModelSaveDTO dto);

    /** 删除 */
    void delete(Long id);
}
