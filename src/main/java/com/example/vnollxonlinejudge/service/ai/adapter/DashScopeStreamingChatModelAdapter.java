package com.example.vnollxonlinejudge.service.ai.adapter;

import com.example.vnollxonlinejudge.model.entity.AiModel;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * 阿里云百炼（DashScope）适配器：使用兼容模式 Base URL
 * 华北2（北京）：https://dashscope.aliyuncs.com/compatible-mode/v1
 * 模型如 qwen-plus、qwen-turbo 等
 */
@Component
public class DashScopeStreamingChatModelAdapter implements StreamingChatModelAdapter {
    private static final String ADAPTER_CODE = StreamingChatModelAdapter.CODE_DASHSCOPE;
    private static final String DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

    @Override
    public String getAdapterCode() {
        return ADAPTER_CODE;
    }

    @Override
    public StreamingChatLanguageModel build(AiModel model) {
        int timeout = model.getTimeoutSeconds() != null && model.getTimeoutSeconds() > 0
                ? model.getTimeoutSeconds() : 60;
        double temp = model.getTemperature() != null ? model.getTemperature().doubleValue() : 0.7;
        int maxTokens = model.getMaxTokens() != null && model.getMaxTokens() > 0 ? model.getMaxTokens() : 4096;

        String endpoint = model.getEndpoint() != null ? model.getEndpoint().trim() : "";
        String baseUrl = (endpoint.startsWith("http://") || endpoint.startsWith("https://"))
                ? endpoint : DEFAULT_BASE_URL;

        return OpenAiStreamingChatModel.builder()
                .apiKey(model.getApiKey().trim())
                .baseUrl(baseUrl)
                .modelName(model.getModelId())
                .temperature(temp)
                .maxTokens(maxTokens)
                .timeout(Duration.ofSeconds(timeout))
                .logRequests(false)
                .logResponses(false)
                .build();
    }
}
