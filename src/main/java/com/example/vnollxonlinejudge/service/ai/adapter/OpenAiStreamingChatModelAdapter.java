package com.example.vnollxonlinejudge.service.ai.adapter;

import com.example.vnollxonlinejudge.model.entity.AiModel;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * OpenAI 及兼容 API 的适配器（含自定义 baseUrl）
 */
@Component
public class OpenAiStreamingChatModelAdapter implements StreamingChatModelAdapter {
    private static final String ADAPTER_CODE = StreamingChatModelAdapter.CODE_OPENAI;

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
        boolean validBaseUrl = endpoint.startsWith("http://") || endpoint.startsWith("https://");
        String baseUrl = validBaseUrl ? endpoint : null;

        OpenAiStreamingChatModel.OpenAiStreamingChatModelBuilder builder = OpenAiStreamingChatModel.builder()
                .apiKey(model.getApiKey().trim())
                .modelName(model.getModelId())
                .temperature(temp)
                .maxTokens(maxTokens)
                .timeout(Duration.ofSeconds(timeout))
                .logRequests(false)
                .logResponses(false);
        if (baseUrl != null) {
            builder.baseUrl(baseUrl);
        }
        return builder.build();
    }
}
