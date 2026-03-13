package com.example.vnollxonlinejudge.service.ai.adapter;

import com.example.vnollxonlinejudge.model.entity.AiModel;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;

/**
 * LangChain4j 子类型适配器：仅用于 platform=langchain4j 时，按 adapter_code 选 openai/mistral/dashscope 构建流式模型
 */
public interface StreamingChatModelAdapter {
    /** 适配器编码，与 ai_model.adapter_code 一致：openai / mistral / dashscope */
    String getAdapterCode();

    /** 根据模型配置构建流式聊天模型 */
    StreamingChatLanguageModel build(AiModel model);
}
