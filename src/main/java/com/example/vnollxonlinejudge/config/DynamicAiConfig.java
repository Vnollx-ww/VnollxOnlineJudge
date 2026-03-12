package com.example.vnollxonlinejudge.config;

import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.mistralai.MistralAiStreamingChatModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 动态AI配置管理器
 * 支持在运行时动态更新API Key而无需重启服务
 */
@Component
public class DynamicAiConfig {
    private static final Logger logger = LoggerFactory.getLogger(DynamicAiConfig.class);

    @Value("${mistral.model:mistral-small-latest}")
    private String model;

    @Value("${mistral.temperature:0.7}")
    private double temperature;

    @Value("${mistral.timeout:60}")
    private int timeout;

    @Value("${mistral.apiKey:}")
    private String defaultApiKey;

    private final AtomicReference<String> currentApiKey = new AtomicReference<>();
    private final AtomicReference<StreamingChatLanguageModel> currentModel = new AtomicReference<>();

    @PostConstruct
    public void init() {
        // 优先使用环境变量，否则使用配置的默认值
        String envApiKey = System.getenv("MISTRAL_API_KEY");
        if (envApiKey != null && !envApiKey.trim().isEmpty()) {
            updateApiKey(envApiKey);
            logger.info("AI配置初始化完成，使用环境变量中的API Key");
        } else if (defaultApiKey != null && !defaultApiKey.trim().isEmpty()) {
            updateApiKey(defaultApiKey);
            logger.info("AI配置初始化完成，使用默认API Key (Mistral)");
        } else {
            logger.warn("未检测到API Key配置，请通过管理界面配置");
        }
    }

    /**
     * 更新 API Key 并重建模型
     */
    public synchronized void updateApiKey(String newApiKey) {
        if (newApiKey == null || newApiKey.trim().isEmpty()) {
            throw new IllegalArgumentException("API Key 不能为空");
        }

        String maskedKey = maskApiKey(newApiKey);
        logger.info("正在更新 API Key: {}", maskedKey);

        try {
            MistralAiStreamingChatModel newModel = MistralAiStreamingChatModel.builder()
                    .apiKey(newApiKey.trim())
                    .modelName(model)
                    .temperature(temperature)
                    .timeout(Duration.ofSeconds(timeout))
                    .logRequests(true)
                    .logResponses(true)
                    .build();

            currentApiKey.set(newApiKey.trim());
            currentModel.set(newModel);

            logger.info("API Key 更新成功: {}", maskedKey);
        } catch (Exception e) {
            logger.error("更新 API Key 失败: {}", e.getMessage(), e);
            throw new RuntimeException("更新 API Key 失败: " + e.getMessage());
        }
    }

    /**
     * 更新模型配置
     */
    public synchronized void updateModelConfig(String newModel, Double newTemperature) {
        if (newModel != null && !newModel.trim().isEmpty()) {
            this.model = newModel.trim();
        }
        if (newTemperature != null) {
            this.temperature = newTemperature;
        }

        // 如果已有 API Key，则重建模型
        String apiKey = currentApiKey.get();
        if (apiKey != null) {
            updateApiKey(apiKey);
        }
    }

    /**
     * 获取当前的流式聊天模型
     */
    public StreamingChatLanguageModel getStreamingModel() {
        StreamingChatLanguageModel model = currentModel.get();
        if (model == null) {
            throw new IllegalStateException("AI模型未初始化，请先配置 API Key");
        }
        return model;
    }

    /**
     * 检查是否已配置
     */
    public boolean isConfigured() {
        return currentModel.get() != null;
    }

    /**
     * 获取当前配置信息（脱敏）
     */
    public AiConfigInfo getConfigInfo() {
        String apiKey = currentApiKey.get();
        return new AiConfigInfo(
                apiKey != null ? maskApiKey(apiKey) : "未配置",
                model,
                temperature,
                isConfigured()
        );
    }

    private String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.length() < 8) {
            return "****";
        }
        return apiKey.substring(0, 4) + "****" + apiKey.substring(apiKey.length() - 4);
    }

    /**
     * AI配置信息
     */
    public record AiConfigInfo(
            String apiKey,
            String model,
            double temperature,
            boolean configured
    ) {}
}
