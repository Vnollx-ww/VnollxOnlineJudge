package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.dashscope.common.Message;
import com.example.vnollxonlinejudge.model.entity.AiChatRecord;
import com.example.vnollxonlinejudge.model.entity.AiChatSummary;
import com.example.vnollxonlinejudge.model.entity.AiModel;
import com.example.vnollxonlinejudge.model.entity.AiPlatform;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryItemVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryPageVo;
import com.example.vnollxonlinejudge.service.AiChatRecordService;
import com.example.vnollxonlinejudge.service.AiChatSummaryService;
import com.example.vnollxonlinejudge.service.AiModelService;
import com.example.vnollxonlinejudge.service.AiPlatformService;
import com.example.vnollxonlinejudge.service.AiService;
import com.example.vnollxonlinejudge.service.ai.OjAssistant;
import com.example.vnollxonlinejudge.service.ai.OjTools;
import com.example.vnollxonlinejudge.service.ai.zhipu.ZhipuAiStreamingClient;
import com.example.vnollxonlinejudge.service.ai.dashscope.DashScopeAiStreamingClient;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
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
    /** 内存中保留的最近对话轮数（每轮=1条user+1条ai） */
    private static final int RECENT_ROUNDS_KEEP = 4;
    /** 触发摘要生成的内存对话轮数阈值 */
    private static final int SUMMARY_THRESHOLD_ROUNDS = 8;

    private final AiModelService aiModelService;
    private final AiChatRecordService aiChatRecordService;
    private final AiChatSummaryService aiChatSummaryService;
    private final AiPlatformService aiPlatformService;
    private final OjTools ojTools;
    private final Map<Long, List<ChatMessage>> userMessageHistories = new ConcurrentHashMap<>();

    public AiServiceImpl(AiModelService aiModelService, AiChatRecordService aiChatRecordService,
                         AiChatSummaryService aiChatSummaryService,
                         AiPlatformService aiPlatformService, OjTools ojTools) {
        this.aiModelService = aiModelService;
        this.aiChatRecordService = aiChatRecordService;
        this.aiChatSummaryService = aiChatSummaryService;
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

        // 如果内存中没有该用户的历史，从DB加载摘要+最近记录来恢复上下文
        if (!userMessageHistories.containsKey(userId)) {
            initContextFromDb(userId);
        }

        // 调试日志：记录每次调用触发的模型信息
        int historySize = userMessageHistories.containsKey(userId) ? userMessageHistories.get(userId).size() : 0;
        logger.info("[AI调用] userId={}, modelId={}, modelName={}, platform={}, historyMsgCount={}",
                userId, aiModel.getId(), aiModel.getName(), platform.getCode(), historySize);

        if ("zhipu".equalsIgnoreCase(platform.getCode())) {
            return chatViaZhipu(userId, recordModelId, message, aiModel, startMs);
        }

        if ("dashscope".equalsIgnoreCase(platform.getCode())) {
            return chatViaDashScope(userId, recordModelId, message, aiModel, startMs);
        }

        if ("langchain4j".equalsIgnoreCase(platform.getCode())) {
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
                                    maybeSummarize(userId, record.getId());
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

        // 不支持的平台
        return Flux.just("[ERROR] 不支持的 AI 平台: " + platform.getCode());
    }

    /** DashScope 平台：直接用 dashscope-sdk-java 流式调用，不经过 LangChain4j */
    private Flux<String> chatViaDashScope(Long userId, Long recordModelId, String message, AiModel aiModel, long startMs) {
        if (aiModel.getApiKey() == null || aiModel.getApiKey().trim().isEmpty()) {
            return Flux.just("[ERROR] 该模型未配置 API Key");
        }
        float temp = aiModel.getTemperature() != null ? aiModel.getTemperature().floatValue() : 0.7f;
        int maxTokens = aiModel.getMaxTokens() != null && aiModel.getMaxTokens() > 0 ? aiModel.getMaxTokens() : 8192;
        DashScopeAiStreamingClient client = DashScopeAiStreamingClient.builder()
                .apiKey(aiModel.getApiKey().trim())
                .modelId(aiModel.getModelId())
                .temperature(temp)
                .maxTokens(maxTokens)
                .build();

        List<Message> dashscopeMessages = new java.util.ArrayList<>();
        List<ChatMessage> history = userMessageHistories.get(userId);
        if (history != null) {
            for (ChatMessage m : history) {
                if (m instanceof SystemMessage s) {
                    // 摘要作为系统消息注入（必须放在最前面）
                    dashscopeMessages.add(0, DashScopeAiStreamingClient.systemMessage(s.text()));
                } else if (m instanceof UserMessage u) {
                    dashscopeMessages.add(DashScopeAiStreamingClient.userMessage(u.singleText()));
                } else if (m instanceof AiMessage a) {
                    dashscopeMessages.add(DashScopeAiStreamingClient.assistantMessage(a.text()));
                }
            }
        }
        dashscopeMessages.add(DashScopeAiStreamingClient.userMessage(message));

        return Flux.create(sink -> {
            try {
                StringBuilder fullResponse = new StringBuilder();
                StringBuilder fullThinking = new StringBuilder();
                client.streamChat(dashscopeMessages, new DashScopeAiStreamingClient.StreamCallback() {
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
                            maybeSummarize(userId, record.getId());
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
                        logger.error("用户 {} DashScope 对话错误: {}", userId, t.getMessage(), t);
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
                logger.error("DashScope 调用异常: {}", e.getMessage(), e);
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
                if (m instanceof SystemMessage s) {
                    // 摘要作为系统消息注入（必须放在最前面）
                    zhipuMessages.add(0, ZhipuAiStreamingClient.systemMessage(s.text()));
                } else if (m instanceof UserMessage u) {
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
                            maybeSummarize(userId, record.getId());
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
        try {
            aiChatSummaryService.deleteByUserId(userId);
            logger.info("[AI摘要] 已清除用户 {} 的对话摘要", userId);
        } catch (Exception e) {
            logger.warn("清除用户 {} 对话摘要失败: {}", userId, e.getMessage());
        }
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

    @Override
    public AiChatHistoryPageVo getMessageHistoryPage(Long userId, Long beforeId, int limit) {
        long total = aiChatRecordService.countByUserId(userId);
        List<AiChatRecord> records = aiChatRecordService.listByUserIdBeforeId(userId, beforeId, limit);
        if (records == null || records.isEmpty()) {
            return AiChatHistoryPageVo.builder()
                    .items(Collections.emptyList())
                    .nextCursor(null)
                    .hasMore(false)
                    .total(total)
                    .build();
        }
        List<AiChatHistoryItemVo> list = new java.util.ArrayList<>();
        Long minId = null;
        for (AiChatRecord record : records) {
            if (minId == null || record.getId() < minId) {
                minId = record.getId();
            }
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
        // 按时间升序排列，便于前端展示
        list.sort((a, b) -> Long.compare(a.getTimestamp(), b.getTimestamp()));
        // 判断是否还有更多数据
        boolean hasMore = minId != null && aiChatRecordService.listByUserIdBeforeId(userId, minId, 1).size() > 0;
        return AiChatHistoryPageVo.builder()
                .items(list)
                .nextCursor(hasMore ? minId : null)
                .hasMore(hasMore)
                .total(total)
                .build();
    }

    private String getMessageContent(ChatMessage chatMessage) {
        if (chatMessage instanceof UserMessage) {
            return ((UserMessage) chatMessage).singleText();
        } else if (chatMessage instanceof AiMessage) {
            return ((AiMessage) chatMessage).text();
        }
        return chatMessage.toString();
    }

    // ===================== 对话摘要相关 =====================

    /**
     * 从 DB 加载摘要 + 最近对话记录，恢复内存上下文。
     * 仅在 userMessageHistories 中没有该用户时调用。
     */
    private void initContextFromDb(Long userId) {
        List<ChatMessage> msgs = new java.util.ArrayList<>();

        // 1. 加载最新摘要
        AiChatSummary summary = aiChatSummaryService.getLatestByUserId(userId);
        if (summary != null && summary.getSummaryContent() != null && !summary.getSummaryContent().isEmpty()) {
            // 摘要作为 SystemMessage 注入上下文
            msgs.add(SystemMessage.from("[之前的对话摘要]\n" + summary.getSummaryContent()));
        }

        // 2. 加载摘要之后的最近对话记录（最多 RECENT_ROUNDS_KEEP 条记录 = RECENT_ROUNDS_KEEP 轮）
        Long afterId = summary != null ? summary.getCoveredUntilRecordId() : null;
        List<AiChatRecord> recentRecords = aiChatRecordService.listByUserIdAfterId(userId, afterId, RECENT_ROUNDS_KEEP);

        // listByUserIdAfterId 按 ID 降序返回，需要反转为升序
        java.util.Collections.reverse(recentRecords);

        for (AiChatRecord record : recentRecords) {
            if (record.getUserMessage() != null && !record.getUserMessage().trim().isEmpty()) {
                msgs.add(UserMessage.from(record.getUserMessage().trim()));
            }
            if (record.getModelReply() != null && !record.getModelReply().trim().isEmpty()) {
                msgs.add(AiMessage.from(record.getModelReply().trim()));
            }
        }

        userMessageHistories.put(userId, msgs);
        logger.info("[AI上下文] 从DB恢复用户 {} 的上下文: 摘要={}, 最近记录={}条, 总消息={}条",
                userId, summary != null, recentRecords.size(), msgs.size());
    }

    /**
     * 检查是否需要生成摘要。当内存中的对话轮数超过阈值时，
     * 将较旧的对话压缩成摘要，只保留最近 RECENT_ROUNDS_KEEP 轮。
     */
    private void maybeSummarize(Long userId, Long latestRecordId) {
        List<ChatMessage> history = userMessageHistories.get(userId);
        if (history == null) return;

        // 统计纯对话消息数（排除 SystemMessage）
        long dialogMsgCount = history.stream()
                .filter(m -> m instanceof UserMessage || m instanceof AiMessage)
                .count();
        int rounds = (int) (dialogMsgCount / 2);

        if (rounds < SUMMARY_THRESHOLD_ROUNDS) return;

        logger.info("[AI摘要] 用户 {} 对话已达 {} 轮，开始生成摘要...", userId, rounds);

        try {
            // 分离：要摘要的旧消息 和 要保留的新消息
            // 保留最近 RECENT_ROUNDS_KEEP 轮（= RECENT_ROUNDS_KEEP*2 条对话消息）
            int keepMsgCount = RECENT_ROUNDS_KEEP * 2;
            List<ChatMessage> dialogMessages = history.stream()
                    .filter(m -> m instanceof UserMessage || m instanceof AiMessage)
                    .collect(Collectors.toList());
            int toSummarizeCount = dialogMessages.size() - keepMsgCount;
            if (toSummarizeCount <= 0) return;

            List<ChatMessage> toSummarize = dialogMessages.subList(0, toSummarizeCount);
            List<ChatMessage> toKeep = dialogMessages.subList(toSummarizeCount, dialogMessages.size());

            // 构建摘要文本（直接用字符串拼接，不消耗 AI token）
            StringBuilder summaryText = new StringBuilder();

            // 先加载现有摘要
            AiChatSummary existingSummary = aiChatSummaryService.getLatestByUserId(userId);
            if (existingSummary != null && existingSummary.getSummaryContent() != null
                    && !existingSummary.getSummaryContent().isEmpty()) {
                summaryText.append(existingSummary.getSummaryContent()).append("\n\n");
            }

            // 将旧对话追加到摘要
            summaryText.append("--- 最近对话要点 ---\n");
            for (ChatMessage m : toSummarize) {
                if (m instanceof UserMessage u) {
                    String text = u.singleText();
                    // 截取前200字符避免摘要过大
                    if (text.length() > 200) text = text.substring(0, 200) + "...";
                    summaryText.append("用户: ").append(text).append("\n");
                } else if (m instanceof AiMessage a) {
                    String text = a.text();
                    if (text.length() > 300) text = text.substring(0, 300) + "...";
                    summaryText.append("AI: ").append(text).append("\n");
                }
            }

            // 限制摘要总长度，避免无限增长
            String finalSummary = summaryText.toString();
            if (finalSummary.length() > 3000) {
                finalSummary = finalSummary.substring(finalSummary.length() - 3000);
            }

            int totalRounds = (existingSummary != null ? existingSummary.getCoveredRounds() : 0)
                    + toSummarizeCount / 2;

            // 保存或更新摘要
            AiChatSummary summary;
            if (existingSummary != null) {
                summary = existingSummary;
                summary.setSummaryContent(finalSummary);
                summary.setCoveredUntilRecordId(latestRecordId);
                summary.setCoveredRounds(totalRounds);
                summary.setUpdateTime(LocalDateTime.now());
            } else {
                summary = AiChatSummary.builder()
                        .userId(userId)
                        .summaryContent(finalSummary)
                        .coveredUntilRecordId(latestRecordId)
                        .coveredRounds(totalRounds)
                        .createTime(LocalDateTime.now())
                        .updateTime(LocalDateTime.now())
                        .build();
            }
            aiChatSummaryService.saveOrUpdate(summary);

            // 重建内存上下文：摘要 SystemMessage + 保留的最近消息
            List<ChatMessage> newHistory = new java.util.ArrayList<>();
            newHistory.add(SystemMessage.from("[之前的对话摘要]\n" + finalSummary));
            newHistory.addAll(toKeep);
            userMessageHistories.put(userId, newHistory);

            logger.info("[AI摘要] 用户 {} 摘要生成完成: 压缩 {} 轮对话, 保留 {} 轮, 摘要长度={}字符",
                    userId, toSummarizeCount / 2, RECENT_ROUNDS_KEEP, finalSummary.length());
        } catch (Exception e) {
            logger.warn("[AI摘要] 用户 {} 摘要生成失败: {}", userId, e.getMessage(), e);
        }
    }
}
