package com.example.vnollxonlinejudge.service.ai.zhipu;

import ai.z.openapi.ZhipuAiClient;
import ai.z.openapi.service.model.ChatCompletionCreateParams;
import ai.z.openapi.service.model.ChatCompletionResponse;
import ai.z.openapi.service.model.ChatMessage;
import ai.z.openapi.service.model.ChatMessageRole;
import ai.z.openapi.service.model.ChatThinking;
import ai.z.openapi.service.model.Delta;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

import io.reactivex.rxjava3.schedulers.Schedulers;

/**
 * 专用于智谱 SDK 的 API 调用封装，仅负责使用 zai-sdk 发起流式对话请求。
 * 不依赖 LangChain4j；智谱平台在服务层直接调用此类，不经过 LangChain4j。
 */
public class ZhipuAiStreamingClient {
    private static final Logger logger = LoggerFactory.getLogger(ZhipuAiStreamingClient.class);

    private final String apiKey;
    private final String modelId;
    private final float temperature;
    private final int maxTokens;

    private ZhipuAiStreamingClient(String apiKey, String modelId, float temperature, int maxTokens) {
        this.apiKey = apiKey;
        this.modelId = modelId;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
    }

    public static Builder builder() {
        return new Builder();
    }

    /**
     * 流式对话：使用智谱 SDK 发起请求，通过回调推送每个 token 和完成/错误。
     *
     * @param messages 智谱 SDK 格式的消息列表（ChatMessage）
     * @param callback 流式回调
     */
    public void streamChat(List<ChatMessage> messages, StreamCallback callback) {
        ZhipuAiClient client = ZhipuAiClient.builder()
                .ofZHIPU()
                .apiKey(apiKey)
                .build();

        ChatCompletionCreateParams request = ChatCompletionCreateParams.builder()
                .model(modelId)
                .messages(messages)
                .thinking(ChatThinking.builder().type("enabled").build())
                .stream(true)
                .maxTokens(maxTokens)
                .temperature(temperature)
                .build();

        ChatCompletionResponse response = client.chat().createChatCompletion(request);

        if (!response.isSuccess()) {
            callback.onError(new RuntimeException(response.getMsg() != null ? response.getMsg() : "智谱 API 请求失败"));
            return;
        }

        if (response.getFlowable() == null) {
            callback.onError(new RuntimeException("未返回流式数据"));
            return;
        }

        // 用 subscribeOn 在后台线程消费流，避免阻塞调用线程，这样 token 会随到随推给 callback
        response.getFlowable()
                .subscribeOn(Schedulers.io())
                .subscribe(
                        data -> {
                            if (data.getChoices() == null || data.getChoices().isEmpty()) return;
                            Delta delta = data.getChoices().get(0).getDelta();
                            if (delta == null) return;
                            // 思考内容与最终答复分开回调，便于前端区分展示
                            if (delta.getReasoningContent() != null && !delta.getReasoningContent().isEmpty()) {
                                callback.onThinkingToken(delta.getReasoningContent());
                            }
                            if (delta.getContent() != null && !delta.getContent().isEmpty()) {
                                callback.onContentToken(delta.getContent());
                            }
                        },
                        error -> {
                            logger.warn("智谱流式响应错误: {}", error.getMessage());
                            callback.onError(error);
                        },
                        callback::onComplete
                );
    }

    /**
     * 流式回调接口：区分思考过程与最终答复，便于前端分别展示
     */
    public interface StreamCallback {
        /** 思考过程流式片段（如智谱 reasoningContent） */
        void onThinkingToken(String token);

        /** 最终答复流式片段（如智谱 content） */
        void onContentToken(String token);

        void onComplete();

        void onError(Throwable t);
    }

    /**
     * 构建一条智谱格式的用户消息
     */
    public static ChatMessage userMessage(String content) {
        return ChatMessage.builder()
                .role(ChatMessageRole.USER.value())
                .content(content)
                .build();
    }

    /**
     * 构建一条智谱格式的助手消息
     */
    public static ChatMessage assistantMessage(String content) {
        return ChatMessage.builder()
                .role(ChatMessageRole.ASSISTANT.value())
                .content(content)
                .build();
    }

    /**
     * 构建一条智谱格式的系统消息
     */
    public static ChatMessage systemMessage(String content) {
        return ChatMessage.builder()
                .role(ChatMessageRole.SYSTEM.value())
                .content(content)
                .build();
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

        public ZhipuAiStreamingClient build() {
            if (apiKey == null || apiKey.isBlank()) {
                throw new IllegalArgumentException("智谱 apiKey 不能为空");
            }
            if (modelId == null || modelId.isBlank()) {
                throw new IllegalArgumentException("智谱 modelId 不能为空");
            }
            return new ZhipuAiStreamingClient(apiKey, modelId, temperature, maxTokens);
        }
    }
}
