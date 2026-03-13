package com.example.vnollxonlinejudge.service.ai.dashscope;

import com.alibaba.dashscope.aigc.generation.Generation;
import com.alibaba.dashscope.aigc.generation.GenerationParam;
import com.alibaba.dashscope.aigc.generation.GenerationResult;
import com.alibaba.dashscope.common.Message;
import com.alibaba.dashscope.common.Role;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import io.reactivex.Flowable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/**
 * 阿里云 DashScope SDK 流式调用封装
 * 支持 DeepSeek v3.1 等模型
 */
public class DashScopeAiStreamingClient {
    private static final Logger logger = LoggerFactory.getLogger(DashScopeAiStreamingClient.class);

    private final String apiKey;
    private final String modelId;
    private final float temperature;
    private final int maxTokens;

    private DashScopeAiStreamingClient(Builder builder) {
        this.apiKey = builder.apiKey;
        this.modelId = builder.modelId;
        this.temperature = builder.temperature;
        this.maxTokens = builder.maxTokens;
    }

    public static Builder builder() {
        return new Builder();
    }

    /**
     * 流式对话：使用 DashScope SDK 发起请求，通过回调推送每个 token 和完成/错误。
     *
     * @param messages DashScope SDK 格式的消息列表（Message）
     * @param callback 流式回调
     */
    public void streamChat(List<Message> messages, StreamCallback callback) {
        try {
            // 设置 API Key 到系统属性
            System.setProperty("DASHSCOPE_API_KEY", apiKey);

            Generation generation = new Generation();
            GenerationParam param = GenerationParam.builder()
                    .apiKey(apiKey.trim())
                    .model(modelId)
                    .enableThinking(false)
                    .incrementalOutput(true)
                    .resultFormat("message")
                    .temperature(temperature)
                    .maxTokens(maxTokens)
                    .messages(messages)
                    .build();

            Flowable<GenerationResult> result = generation.streamCall(param);
            result.blockingForEach(genResult -> {
                try {
                    handleGenerationResult(genResult, callback);
                } catch (Exception e) {
                    logger.error("处理 DashScope 响应失败: {}", e.getMessage(), e);
                    callback.onError(e);
                }
            });
            callback.onComplete();
        } catch (Exception e) {
            logger.error("DashScope 流式调用失败: {}", e.getMessage(), e);
            callback.onError(e);
        }
    }

    private void handleGenerationResult(GenerationResult message, StreamCallback callback) {
        String reasoning = message.getOutput().getChoices().get(0).getMessage().getReasoningContent();
        String content = message.getOutput().getChoices().get(0).getMessage().getContent();

        if (reasoning != null && !reasoning.isEmpty()) {
            callback.onThinkingToken(reasoning);
        }
        if (content != null && !content.isEmpty()) {
            callback.onContentToken(content);
        }
    }

    /**
     * 构建一条 DashScope 格式的用户消息
     */
    public static Message userMessage(String content) {
        return Message.builder()
                .role(Role.USER.getValue())
                .content(content)
                .build();
    }

    /**
     * 构建一条 DashScope 格式的助手消息
     */
    public static Message assistantMessage(String content) {
        return Message.builder()
                .role(Role.ASSISTANT.getValue())
                .content(content)
                .build();
    }

    /**
     * 构建一条 DashScope 格式的系统消息
     */
    public static Message systemMessage(String content) {
        return Message.builder()
                .role(Role.SYSTEM.getValue())
                .content(content)
                .build();
    }

    /**
     * 流式回调接口
     */
    public interface StreamCallback {
        void onThinkingToken(String token);
        void onContentToken(String token);
        void onComplete();
        void onError(Throwable t);
    }

    public static final class Builder {
        private String apiKey;
        private String modelId;
        private float temperature = 0.7f;
        private int maxTokens = 4096;

        public Builder apiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }

        public Builder modelId(String modelId) {
            this.modelId = modelId;
            return this;
        }

        public Builder temperature(float temperature) {
            this.temperature = temperature;
            return this;
        }

        public Builder maxTokens(int maxTokens) {
            this.maxTokens = maxTokens;
            return this;
        }

        public DashScopeAiStreamingClient build() {
            return new DashScopeAiStreamingClient(this);
        }
    }
}
