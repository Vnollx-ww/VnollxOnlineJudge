package com.example.vnollxonlinejudge.service.ai.adapter;

import com.example.vnollxonlinejudge.model.entity.AiModel;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.mistralai.MistralAiStreamingChatModel;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Mistral 官方 API 适配器
 */
@Component
public class MistralStreamingChatModelAdapter implements StreamingChatModelAdapter {
    private static final String ADAPTER_CODE = "mistral";

    @Override
    public String getAdapterCode() {
        return ADAPTER_CODE;
    }

    @Override
    public StreamingChatLanguageModel build(AiModel model) {
        int timeout = model.getTimeoutSeconds() != null && model.getTimeoutSeconds() > 0
                ? model.getTimeoutSeconds() : 60;
        double temp = model.getTemperature() != null ? model.getTemperature().doubleValue() : 0.7;

        return MistralAiStreamingChatModel.builder()
                .apiKey(model.getApiKey().trim())
                .modelName(model.getModelId())
                .temperature(temp)
                .timeout(Duration.ofSeconds(timeout))
                .logRequests(false)
                .logResponses(false)
                .build();
    }
}
