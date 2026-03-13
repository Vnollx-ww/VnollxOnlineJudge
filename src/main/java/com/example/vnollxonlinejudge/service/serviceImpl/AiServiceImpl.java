package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.model.entity.AiChatRecord;
import com.example.vnollxonlinejudge.model.entity.AiModel;
import com.example.vnollxonlinejudge.model.entity.AiPlatform;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryItemVo;
import com.example.vnollxonlinejudge.service.AiChatRecordService;
import com.example.vnollxonlinejudge.service.AiModelService;
import com.example.vnollxonlinejudge.service.AiPlatformService;
import com.example.vnollxonlinejudge.service.AiService;
import com.example.vnollxonlinejudge.service.ai.OjAssistant;
import com.example.vnollxonlinejudge.service.ai.OjTools;
import com.example.vnollxonlinejudge.service.ai.zhipu.ZhipuAiStreamingClient;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.TokenStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AiServiceImpl implements AiService {
    private static final Logger logger = LoggerFactory.getLogger(AiServiceImpl.class);
    private final AiModelService aiModelService;
    private final AiChatRecordService aiChatRecordService;
    private final AiPlatformService aiPlatformService;
    private final OjTools ojTools;
    private final Map<Long, List<ChatMessage>> userMessageHistories = new ConcurrentHashMap<>();

    public AiServiceImpl(AiModelService aiModelService, AiChatRecordService aiChatRecordService,
                         AiPlatformService aiPlatformService, OjTools ojTools) {
        this.aiModelService = aiModelService;
        this.aiChatRecordService = aiChatRecordService;
        this.aiPlatformService = aiPlatformService;
        this.ojTools = ojTools;
    }

    @Override
    public Flux<String> chat(Long userId, Long modelId, String message) {
        ojTools.setCurrentUserId(userId);
        AiModel aiModel = aiModelService.getById(modelId);
        AiPlatform platform = aiPlatformService.getById(aiModel.getPlatformId());
        long startMs = System.currentTimeMillis();
        Long recordModelId = aiModel.getId();

        if ("zhipu".equalsIgnoreCase(platform.getCode())) {
            return chatViaZhipu(userId, recordModelId, message, aiModel, startMs);
        }

        StreamingChatLanguageModel streamingModel = aiModelService.buildStreamingModel(aiModel);
        OjAssistant assistant = AiServices.builder(OjAssistant.class)
                .streamingChatLanguageModel(streamingModel)
                .chatMemoryProvider(memoryId -> MessageWindowChatMemory.withMaxMessages(15))
                .tools(ojTools)
                .build();

        return Flux.create(sink -> {
            try {
                TokenStream tokenStream = assistant.chat(userId, message);
                StringBuilder fullResponse = new StringBuilder();

                tokenStream
                        .onNext(token -> {
                            fullResponse.append(token);
                            sink.next(token);
                        })
                        .onComplete(response -> {
                            long latencyMs = System.currentTimeMillis() - startMs;
                            userMessageHistories.computeIfAbsent(userId, k -> new java.util.ArrayList<>());
                            userMessageHistories.get(userId).add(UserMessage.from(message));
                            userMessageHistories.get(userId).add(AiMessage.from(fullResponse.toString()));

                            AiChatRecord record = AiChatRecord.builder()
                                    .userId(userId)
                                    .modelId(recordModelId)
                                    .userMessage(message)
                                    .modelReply(fullResponse.toString())
                                    .latencyMs((int) latencyMs)
                                    .status("success")
                                    .createTime(LocalDateTime.now())
                                    .replyTime(LocalDateTime.now())
                                    .build();
                            try {
                                aiChatRecordService.save(record);
                            } catch (Exception e) {
                                logger.warn("保存对话记录失败: {}", e.getMessage());
                            }
                            ojTools.clearCurrentUserId();
                            sink.next("[DONE]");
                            sink.complete();
                        })
                        .onError(error -> {
                            long latencyMs = System.currentTimeMillis() - startMs;
                            logger.error("用户 {} 对话错误: {}", userId, error.getMessage(), error);
                            AiChatRecord record = AiChatRecord.builder()
                                    .userId(userId)
                                    .modelId(recordModelId)
                                    .userMessage(message)
                                    .status("error")
                                    .errorMessage(error.getMessage())
                                    .latencyMs((int) latencyMs)
                                    .createTime(LocalDateTime.now())
                                    .replyTime(LocalDateTime.now())
                                    .build();
                            try {
                                aiChatRecordService.save(record);
                            } catch (Exception e) {
                                logger.warn("保存对话记录失败: {}", e.getMessage());
                            }
                            ojTools.clearCurrentUserId();
                            sink.next("[ERROR] " + error.getMessage());
                            sink.complete();
                        })
                        .start();
            } catch (Exception e) {
                logger.error("处理用户 {} 消息时发生异常: {}", userId, e.getMessage(), e);
                ojTools.clearCurrentUserId();
                sink.next("[ERROR] " + e.getMessage());
                sink.complete();
            }
        });
    }

    /** 智谱平台：直接用 zai-sdk 流式调用，不经过 LangChain4j */
    private Flux<String> chatViaZhipu(Long userId, Long recordModelId, String message, AiModel aiModel, long startMs) {
        if (aiModel.getApiKey() == null || aiModel.getApiKey().trim().isEmpty()) {
            return Flux.just("[ERROR] 该模型未配置 API Key");
        }
        float temp = aiModel.getTemperature() != null ? aiModel.getTemperature().floatValue() : 0.7f;
        int maxTokens = aiModel.getMaxTokens() != null && aiModel.getMaxTokens() > 0 ? aiModel.getMaxTokens() : 8192;
        ZhipuAiStreamingClient client = ZhipuAiStreamingClient.builder()
                .apiKey(aiModel.getApiKey().trim())
                .modelId(aiModel.getModelId())
                .temperature(temp)
                .maxTokens(maxTokens)
                .build();

        List<ai.z.openapi.service.model.ChatMessage> zhipuMessages = new java.util.ArrayList<>();
        List<ChatMessage> history = userMessageHistories.get(userId);
        if (history != null) {
            for (ChatMessage m : history) {
                if (m instanceof UserMessage u) {
                    zhipuMessages.add(ZhipuAiStreamingClient.userMessage(u.singleText()));
                } else if (m instanceof AiMessage a) {
                    zhipuMessages.add(ZhipuAiStreamingClient.assistantMessage(a.text()));
                }
            }
        }
        zhipuMessages.add(ZhipuAiStreamingClient.userMessage(message));

        return Flux.create(sink -> {
            try {
                StringBuilder fullResponse = new StringBuilder();
                StringBuilder fullThinking = new StringBuilder();
                client.streamChat(zhipuMessages, new ZhipuAiStreamingClient.StreamCallback() {
                    @Override
                    public void onThinkingToken(String token) {
                        fullThinking.append(token);
                        sink.next("[THINKING]" + token);
                    }

                    @Override
                    public void onContentToken(String token) {
                        fullResponse.append(token);
                        sink.next(token);
                    }

                    @Override
                    public void onComplete() {
                        long latencyMs = System.currentTimeMillis() - startMs;
                        userMessageHistories.computeIfAbsent(userId, k -> new java.util.ArrayList<>());
                        userMessageHistories.get(userId).add(UserMessage.from(message));
                        userMessageHistories.get(userId).add(AiMessage.from(fullResponse.toString()));
                        String thinkingStr = fullThinking.length() > 0 ? fullThinking.toString() : null;
                        AiChatRecord record = AiChatRecord.builder()
                                .userId(userId)
                                .modelId(recordModelId)
                                .userMessage(message)
                                .modelReply(fullResponse.toString())
                                .thinkingContent(thinkingStr)
                                .latencyMs((int) latencyMs)
                                .status("success")
                                .createTime(LocalDateTime.now())
                                .replyTime(LocalDateTime.now())
                                .build();
                        try {
                            aiChatRecordService.save(record);
                        } catch (Exception e) {
                            logger.warn("保存对话记录失败: {}", e.getMessage());
                        }
                        ojTools.clearCurrentUserId();
                        sink.next("[DONE]");
                        sink.complete();
                    }

                    @Override
                    public void onError(Throwable t) {
                        long latencyMs = System.currentTimeMillis() - startMs;
                        logger.error("用户 {} 智谱对话错误: {}", userId, t.getMessage(), t);
                        AiChatRecord record = AiChatRecord.builder()
                                .userId(userId)
                                .modelId(recordModelId)
                                .userMessage(message)
                                .status("error")
                                .errorMessage(t.getMessage())
                                .latencyMs((int) latencyMs)
                                .createTime(LocalDateTime.now())
                                .replyTime(LocalDateTime.now())
                                .build();
                        try {
                            aiChatRecordService.save(record);
                        } catch (Exception e) {
                            logger.warn("保存对话记录失败: {}", e.getMessage());
                        }
                        ojTools.clearCurrentUserId();
                        sink.next("[ERROR] " + (t != null ? t.getMessage() : "未知错误"));
                        sink.complete();
                    }
                });
            } catch (Exception e) {
                logger.error("智谱调用异常: {}", e.getMessage(), e);
                ojTools.clearCurrentUserId();
                sink.next("[ERROR] " + e.getMessage());
                sink.complete();
            }
        });
    }

    @Override
    public Flux<String> chat(Long userId, String message) {
        List<com.example.vnollxonlinejudge.model.vo.ai.AiModelVo> enabled = aiModelService.listEnabled();
        if (enabled.isEmpty()) {
            return Flux.just("[ERROR] 暂无可用的 AI 模型，请联系管理员配置");
        }
        return chat(userId, enabled.get(0).getId(), message);
    }

    @Override
    public void clearMemory(Long userId) {
        userMessageHistories.remove(userId);
    }

    @Override
    public List<AiChatHistoryItemVo> getMessageHistoryList(Long userId) {
        List<AiChatRecord> records = aiChatRecordService.listByUserIdOrderByCreateTimeAsc(userId, 100);
        if (records == null || records.isEmpty()) {
            return Collections.emptyList();
        }
        List<AiChatHistoryItemVo> list = new java.util.ArrayList<>();
        for (AiChatRecord record : records) {
            String userContent = record.getUserMessage() != null ? record.getUserMessage().trim() : "";
            String aiContent = record.getModelReply() != null ? record.getModelReply().trim() : "";
            long createMs = record.getCreateTime() != null
                    ? record.getCreateTime().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
                    : System.currentTimeMillis();
            long replyMs = record.getReplyTime() != null
                    ? record.getReplyTime().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
                    : createMs;
            if (!userContent.isEmpty()) {
                list.add(AiChatHistoryItemVo.builder()
                        .role("user")
                        .content(userContent)
                        .modelLogoUrl(null)
                        .timestamp(createMs)
                        .build());
            }
            if (!aiContent.isEmpty()) {
                String logoUrl = null;
                if (record.getModelId() != null) {
                    AiModel model = aiModelService.getById(record.getModelId());
                    if (model != null) {
                        logoUrl = model.getLogoUrl();
                    }
                }
                String thinkingContent = record.getThinkingContent() != null && !record.getThinkingContent().isEmpty()
                        ? record.getThinkingContent() : null;
                list.add(AiChatHistoryItemVo.builder()
                        .role("bot")
                        .content(aiContent)
                        .thinkingContent(thinkingContent)
                        .modelLogoUrl(logoUrl)
                        .timestamp(replyMs)
                        .build());
            }
        }
        return list;
    }

    private String getMessageContent(ChatMessage chatMessage) {
        if (chatMessage instanceof UserMessage) {
            return ((UserMessage) chatMessage).singleText();
        } else if (chatMessage instanceof AiMessage) {
            return ((AiMessage) chatMessage).text();
        }
        return chatMessage.toString();
    }
}
