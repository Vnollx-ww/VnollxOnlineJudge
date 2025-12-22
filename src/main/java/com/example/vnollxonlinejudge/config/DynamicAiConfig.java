package com.example.vnollxonlinejudge.config;

import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
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

    @Value("${openai.model:qwen-plus}")
    private String model;

    @Value("${openai.temperature:0.7}")
    private double temperature;

    @Value("${openai.timeout:60}")
    private int timeout;

    @Value("${openai.baseUrl:https://dashscope.aliyuncs.com/compatible-mode/v1}")
    private String baseUrl;

    private final AtomicReference<String> currentApiKey = new AtomicReference<>();
    private final AtomicReference<OpenAiStreamingChatModel> currentModel = new AtomicReference<>();

    @PostConstruct
    public void init() {
        // 初始化时从环境变量获取 API Key
        String envApiKey = System.getenv("API_KEY");
        if (envApiKey != null && !envApiKey.trim().isEmpty()) {
            updateApiKey(envApiKey);
            logger.info("AI配置初始化完成，使用环境变量中的API Key");
        } else {
            logger.warn("未检测到环境变量 API_KEY，请通过管理界面配置");
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
            OpenAiStreamingChatModel newModel = OpenAiStreamingChatModel.builder()
                    .apiKey(newApiKey.trim())
                    .baseUrl(baseUrl)
                    .modelName(model)
                    .temperature(temperature)
                    .timeout(Duration.ofSeconds(timeout))
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
    public synchronized void updateModelConfig(String newModel, Double newTemperature, String newBaseUrl) {
        if (newModel != null && !newModel.trim().isEmpty()) {
            this.model = newModel.trim();
        }
        if (newTemperature != null) {
            this.temperature = newTemperature;
        }
        if (newBaseUrl != null && !newBaseUrl.trim().isEmpty()) {
            this.baseUrl = newBaseUrl.trim();
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
    public OpenAiStreamingChatModel getStreamingModel() {
        OpenAiStreamingChatModel model = currentModel.get();
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
                baseUrl,
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
            String baseUrl,
            boolean configured
    ) {}
}
