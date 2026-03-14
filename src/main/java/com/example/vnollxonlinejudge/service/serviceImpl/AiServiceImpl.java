package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.dashscope.common.Message;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.entity.AiChatRecord;
import com.example.vnollxonlinejudge.model.entity.AiChatSession;
import com.example.vnollxonlinejudge.model.entity.AiChatSummary;
import com.example.vnollxonlinejudge.model.entity.AiModel;
import com.example.vnollxonlinejudge.model.entity.AiPlatform;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryItemVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryPageVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatSessionVo;
import com.example.vnollxonlinejudge.service.AiChatRecordService;
import com.example.vnollxonlinejudge.service.AiChatSessionService;
import com.example.vnollxonlinejudge.service.AiChatSummaryService;
import com.example.vnollxonlinejudge.service.AiModelService;
import com.example.vnollxonlinejudge.service.AiPlatformService;
import com.example.vnollxonlinejudge.service.AiService;
import com.example.vnollxonlinejudge.service.ai.OjAssistant;
import com.example.vnollxonlinejudge.service.ai.OjTools;
import com.example.vnollxonlinejudge.service.ai.dashscope.DashScopeAiStreamingClient;
import com.example.vnollxonlinejudge.service.ai.zhipu.ZhipuAiStreamingClient;
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
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AiServiceImpl implements AiService {
    private static final Logger logger = LoggerFactory.getLogger(AiServiceImpl.class);
    private static final int RECENT_ROUNDS_KEEP = 4;
    private static final int SUMMARY_THRESHOLD_ROUNDS = 8;

    private final AiModelService aiModelService;
    private final AiChatRecordService aiChatRecordService;
    private final AiChatSummaryService aiChatSummaryService;
    private final AiPlatformService aiPlatformService;
    private final AiChatSessionService aiChatSessionService;
    private final OjTools ojTools;
    private final Map<String, List<ChatMessage>> sessionMessageHistories = new ConcurrentHashMap<>();

    public AiServiceImpl(AiModelService aiModelService,
                         AiChatRecordService aiChatRecordService,
                         AiChatSummaryService aiChatSummaryService,
                         AiPlatformService aiPlatformService,
                         AiChatSessionService aiChatSessionService,
                         OjTools ojTools) {
        this.aiModelService = aiModelService;
        this.aiChatRecordService = aiChatRecordService;
        this.aiChatSummaryService = aiChatSummaryService;
        this.aiPlatformService = aiPlatformService;
        this.aiChatSessionService = aiChatSessionService;
        this.ojTools = ojTools;
    }

    @Override
    public Flux<String> chat(Long userId, Long modelId, String message) {
        return chat(userId, modelId, resolveOrCreateDefaultSessionId(userId), message);
    }

    @Override
    public Flux<String> chat(Long userId, Long modelId, String sessionId, String message) {
        ensureLegacySessionMigrated(userId);
        AiChatSession session = resolveSession(userId, sessionId);
        String safeSessionId = session.getId();
        String cacheKey = sessionCacheKey(userId, safeSessionId);
        ojTools.setCurrentUserId(userId);

        AiModel aiModel = aiModelService.getById(modelId);
        AiPlatform platform = aiPlatformService.getById(aiModel.getPlatformId());
        long startMs = System.currentTimeMillis();
        Long recordModelId = aiModel.getId();

        if (!sessionMessageHistories.containsKey(cacheKey)) {
            initContextFromDb(userId, safeSessionId);
        }

        int historySize = sessionMessageHistories.getOrDefault(cacheKey, Collections.emptyList()).size();
        logger.info("[AI调用] userId={}, sessionId={}, modelId={}, modelName={}, platform={}, historyMsgCount={}",
                userId, safeSessionId, aiModel.getId(), aiModel.getName(), platform.getCode(), historySize);

        if ("zhipu".equalsIgnoreCase(platform.getCode())) {
            return chatViaZhipu(userId, safeSessionId, recordModelId, message, aiModel, startMs);
        }
        if ("dashscope".equalsIgnoreCase(platform.getCode())) {
            return chatViaDashScope(userId, safeSessionId, recordModelId, message, aiModel, startMs);
        }
        if ("langchain4j".equalsIgnoreCase(platform.getCode())) {
            return chatViaLangChain4j(userId, safeSessionId, recordModelId, message, aiModel, startMs);
        }
        ojTools.clearCurrentUserId();
        return Flux.just("[ERROR] 不支持的 AI 平台: " + platform.getCode());
    }

    @Override
    public Flux<String> chat(Long userId, String message) {
        List<com.example.vnollxonlinejudge.model.vo.ai.AiModelVo> enabled = aiModelService.listEnabled();
        if (enabled.isEmpty()) {
            return Flux.just("[ERROR] 暂无可用的 AI 模型，请联系管理员配置");
        }
        return chat(userId, enabled.get(0).getId(), resolveOrCreateDefaultSessionId(userId), message);
    }

    @Override
    public Flux<String> chat(Long userId, String sessionId, String message) {
        List<com.example.vnollxonlinejudge.model.vo.ai.AiModelVo> enabled = aiModelService.listEnabled();
        if (enabled.isEmpty()) {
            return Flux.just("[ERROR] 暂无可用的 AI 模型，请联系管理员配置");
        }
        return chat(userId, enabled.get(0).getId(), sessionId, message);
    }

    @Override
    public void clearMemory(Long userId) {
        sessionMessageHistories.keySet().removeIf(key -> key.startsWith(userId + ":"));
        aiChatSummaryService.deleteByUserId(userId);
        logger.info("[AI摘要] 已清除用户 {} 的所有会话缓存与摘要", userId);
    }

    @Override
    public AiChatSessionVo createSession(Long userId, String title) {
        ensureLegacySessionMigrated(userId);
        return toSessionVo(aiChatSessionService.createSession(userId, title));
    }

    @Override
    public List<AiChatSessionVo> listSessions(Long userId) {
        ensureLegacySessionMigrated(userId);
        return aiChatSessionService.listByUserId(userId).stream()
                .map(this::toSessionVo)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteSession(Long userId, String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }
        resolveSession(userId, sessionId);
        sessionMessageHistories.remove(sessionCacheKey(userId, sessionId));
        aiChatSummaryService.deleteByUserIdAndSessionId(userId, sessionId);
        aiChatRecordService.deleteBySessionId(userId, sessionId);
        aiChatSessionService.deleteByUserIdAndSessionId(userId, sessionId);
    }

    @Override
    public List<AiChatHistoryItemVo> getMessageHistoryList(Long userId, String sessionId) {
        String resolvedSessionId = resolveReadableSessionId(userId, sessionId);
        if (resolvedSessionId == null) {
            return Collections.emptyList();
        }
        List<AiChatRecord> records = aiChatRecordService.listBySessionIdOrderByCreateTimeAsc(userId, resolvedSessionId, 100);
        return buildHistoryItems(records);
    }

    @Override
    public AiChatHistoryPageVo getMessageHistoryPage(Long userId, String sessionId, Long beforeId, int limit) {
        String resolvedSessionId = resolveReadableSessionId(userId, sessionId);
        if (resolvedSessionId == null) {
            return AiChatHistoryPageVo.builder()
                    .items(Collections.emptyList())
                    .nextCursor(null)
                    .hasMore(false)
                    .total(0L)
                    .build();
        }
        long total = aiChatRecordService.countBySessionId(userId, resolvedSessionId);
        List<AiChatRecord> records = aiChatRecordService.listBySessionIdBeforeId(userId, resolvedSessionId, beforeId, limit);
        if (records == null || records.isEmpty()) {
            return AiChatHistoryPageVo.builder()
                    .items(Collections.emptyList())
                    .nextCursor(null)
                    .hasMore(false)
                    .total(total)
                    .build();
        }
        Long minId = records.stream().map(AiChatRecord::getId).min(Long::compareTo).orElse(null);
        List<AiChatHistoryItemVo> list = buildHistoryItems(records);
        boolean hasMore = minId != null
                && !aiChatRecordService.listBySessionIdBeforeId(userId, resolvedSessionId, minId, 1).isEmpty();
        return AiChatHistoryPageVo.builder()
                .items(list)
                .nextCursor(hasMore ? minId : null)
                .hasMore(hasMore)
                .total(total)
                .build();
    }

    private Flux<String> chatViaLangChain4j(Long userId,
                                            String sessionId,
                                            Long recordModelId,
                                            String message,
                                            AiModel aiModel,
                                            long startMs) {
        StreamingChatLanguageModel streamingModel = aiModelService.buildStreamingModel(aiModel);
        String cacheKey = sessionCacheKey(userId, sessionId);
        List<ChatMessage> history = sessionMessageHistories.getOrDefault(cacheKey, Collections.emptyList());
        long memoryId = toMemoryId(userId, sessionId);
        OjAssistant assistant = AiServices.builder(OjAssistant.class)
                .streamingChatLanguageModel(streamingModel)
                .chatMemoryProvider(id -> {
                    MessageWindowChatMemory memory = MessageWindowChatMemory.withMaxMessages(30);
                    history.forEach(memory::add);
                    return memory;
                })
                .tools(ojTools)
                .build();

        return Flux.create(sink -> {
            try {
                TokenStream tokenStream = assistant.chat(memoryId, message);
                StringBuilder fullResponse = new StringBuilder();
                tokenStream
                        .onNext(token -> {
                            fullResponse.append(token);
                            sink.next(token);
                        })
                        .onComplete(response -> {
                            LocalDateTime now = LocalDateTime.now();
                            long latencyMs = System.currentTimeMillis() - startMs;
                            appendSuccessfulRound(userId, sessionId, message, fullResponse.toString(), null,
                                    recordModelId, latencyMs, now);
                            ojTools.clearCurrentUserId();
                            sink.next("[DONE]");
                            sink.complete();
                        })
                        .onError(error -> {
                            LocalDateTime now = LocalDateTime.now();
                            long latencyMs = System.currentTimeMillis() - startMs;
                            appendFailedRound(userId, sessionId, message, recordModelId, error.getMessage(), latencyMs, now);
                            ojTools.clearCurrentUserId();
                            sink.next("[ERROR] " + error.getMessage());
                            sink.complete();
                        })
                        .start();
            } catch (Exception e) {
                ojTools.clearCurrentUserId();
                sink.next("[ERROR] " + e.getMessage());
                sink.complete();
            }
        });
    }

    private Flux<String> chatViaDashScope(Long userId,
                                          String sessionId,
                                          Long recordModelId,
                                          String message,
                                          AiModel aiModel,
                                          long startMs) {
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
        List<ChatMessage> history = sessionMessageHistories.getOrDefault(sessionCacheKey(userId, sessionId), Collections.emptyList());
        for (ChatMessage m : history) {
            if (m instanceof SystemMessage s) {
                dashscopeMessages.add(0, DashScopeAiStreamingClient.systemMessage(s.text()));
            } else if (m instanceof UserMessage u) {
                dashscopeMessages.add(DashScopeAiStreamingClient.userMessage(u.singleText()));
            } else if (m instanceof AiMessage a) {
                dashscopeMessages.add(DashScopeAiStreamingClient.assistantMessage(a.text()));
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
                        LocalDateTime now = LocalDateTime.now();
                        long latencyMs = System.currentTimeMillis() - startMs;
                        appendSuccessfulRound(userId, sessionId, message, fullResponse.toString(),
                                fullThinking.length() > 0 ? fullThinking.toString() : null,
                                recordModelId, latencyMs, now);
                        ojTools.clearCurrentUserId();
                        sink.next("[DONE]");
                        sink.complete();
                    }

                    @Override
                    public void onError(Throwable t) {
                        LocalDateTime now = LocalDateTime.now();
                        long latencyMs = System.currentTimeMillis() - startMs;
                        appendFailedRound(userId, sessionId, message, recordModelId,
                                t != null ? t.getMessage() : "未知错误", latencyMs, now);
                        ojTools.clearCurrentUserId();
                        sink.next("[ERROR] " + (t != null ? t.getMessage() : "未知错误"));
                        sink.complete();
                    }
                });
            } catch (Exception e) {
                ojTools.clearCurrentUserId();
                sink.next("[ERROR] " + e.getMessage());
                sink.complete();
            }
        });
    }

    private Flux<String> chatViaZhipu(Long userId,
                                      String sessionId,
                                      Long recordModelId,
                                      String message,
                                      AiModel aiModel,
                                      long startMs) {
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
        List<ChatMessage> history = sessionMessageHistories.getOrDefault(sessionCacheKey(userId, sessionId), Collections.emptyList());
        for (ChatMessage m : history) {
            if (m instanceof SystemMessage s) {
                zhipuMessages.add(0, ZhipuAiStreamingClient.systemMessage(s.text()));
            } else if (m instanceof UserMessage u) {
                zhipuMessages.add(ZhipuAiStreamingClient.userMessage(u.singleText()));
            } else if (m instanceof AiMessage a) {
                zhipuMessages.add(ZhipuAiStreamingClient.assistantMessage(a.text()));
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
                        LocalDateTime now = LocalDateTime.now();
                        long latencyMs = System.currentTimeMillis() - startMs;
                        appendSuccessfulRound(userId, sessionId, message, fullResponse.toString(),
                                fullThinking.length() > 0 ? fullThinking.toString() : null,
                                recordModelId, latencyMs, now);
                        ojTools.clearCurrentUserId();
                        sink.next("[DONE]");
                        sink.complete();
                    }

                    @Override
                    public void onError(Throwable t) {
                        LocalDateTime now = LocalDateTime.now();
                        long latencyMs = System.currentTimeMillis() - startMs;
                        appendFailedRound(userId, sessionId, message, recordModelId,
                                t != null ? t.getMessage() : "未知错误", latencyMs, now);
                        ojTools.clearCurrentUserId();
                        sink.next("[ERROR] " + (t != null ? t.getMessage() : "未知错误"));
                        sink.complete();
                    }
                });
            } catch (Exception e) {
                ojTools.clearCurrentUserId();
                sink.next("[ERROR] " + e.getMessage());
                sink.complete();
            }
        });
    }

    private void appendSuccessfulRound(Long userId,
                                       String sessionId,
                                       String userMessage,
                                       String botMessage,
                                       String thinkingContent,
                                       Long modelId,
                                       long latencyMs,
                                       LocalDateTime now) {
        String cacheKey = sessionCacheKey(userId, sessionId);
        sessionMessageHistories.computeIfAbsent(cacheKey, key -> new java.util.ArrayList<>());
        sessionMessageHistories.get(cacheKey).add(UserMessage.from(userMessage));
        sessionMessageHistories.get(cacheKey).add(AiMessage.from(botMessage));

        AiChatRecord record = AiChatRecord.builder()
                .userId(userId)
                .modelId(modelId)
                .sessionId(sessionId)
                .userMessage(userMessage)
                .modelReply(botMessage)
                .thinkingContent(thinkingContent)
                .latencyMs((int) latencyMs)
                .status("success")
                .createTime(now)
                .replyTime(now)
                .build();
        try {
            aiChatRecordService.save(record);
            aiChatSessionService.touchSessionOnMessage(userId, sessionId, modelId, userMessage, now);
            maybeSummarize(userId, sessionId, record.getId());
        } catch (Exception e) {
            logger.warn("保存对话记录失败: {}", e.getMessage());
        }
    }

    private void appendFailedRound(Long userId,
                                   String sessionId,
                                   String userMessage,
                                   Long modelId,
                                   String errorMessage,
                                   long latencyMs,
                                   LocalDateTime now) {
        logger.error("用户 {} 会话 {} 对话错误: {}", userId, sessionId, errorMessage);
        AiChatRecord record = AiChatRecord.builder()
                .userId(userId)
                .modelId(modelId)
                .sessionId(sessionId)
                .userMessage(userMessage)
                .status("error")
                .errorMessage(errorMessage)
                .latencyMs((int) latencyMs)
                .createTime(now)
                .replyTime(now)
                .build();
        try {
            aiChatRecordService.save(record);
        } catch (Exception e) {
            logger.warn("保存对话记录失败: {}", e.getMessage());
        }
    }

    private AiChatSession resolveSession(Long userId, String sessionId) {
        String safeSessionId = sessionId;
        if (safeSessionId == null || safeSessionId.isBlank()) {
            safeSessionId = resolveOrCreateDefaultSessionId(userId);
        }
        AiChatSession session = aiChatSessionService.getByIdAndUserId(userId, safeSessionId);
        if (session == null) {
            throw new BusinessException("会话不存在或已被删除");
        }
        return session;
    }

    private String resolveReadableSessionId(Long userId, String sessionId) {
        ensureLegacySessionMigrated(userId);
        if (sessionId != null && !sessionId.isBlank()) {
            AiChatSession session = aiChatSessionService.getByIdAndUserId(userId, sessionId);
            if (session == null) {
                return null;
            }
            return session.getId();
        }
        AiChatSession latest = aiChatSessionService.getLatestByUserId(userId);
        return latest != null ? latest.getId() : null;
    }

    private String resolveOrCreateDefaultSessionId(Long userId) {
        ensureLegacySessionMigrated(userId);
        AiChatSession latest = aiChatSessionService.getLatestByUserId(userId);
        if (latest != null) {
            return latest.getId();
        }
        return aiChatSessionService.createSession(userId, null).getId();
    }

    private void ensureLegacySessionMigrated(Long userId) {
        if (!aiChatRecordService.hasLegacyRecords(userId)) {
            return;
        }
        AiChatSession latest = aiChatSessionService.getLatestByUserId(userId);
        String legacySessionId = latest != null ? latest.getId() : aiChatSessionService.createSession(userId, "历史会话").getId();
        aiChatRecordService.assignLegacyRecordsToSession(userId, legacySessionId);
        aiChatSummaryService.assignLegacySummariesToSession(userId, legacySessionId);
    }

    private List<AiChatHistoryItemVo> buildHistoryItems(List<AiChatRecord> records) {
        if (records == null || records.isEmpty()) {
            return Collections.emptyList();
        }
        List<AiChatHistoryItemVo> list = new java.util.ArrayList<>();
        for (AiChatRecord record : records) {
            String userContent = record.getUserMessage() != null ? record.getUserMessage().trim() : "";
            String aiContent = record.getModelReply() != null ? record.getModelReply().trim() : "";
            long createMs = toEpochMillis(record.getCreateTime());
            long replyMs = toEpochMillis(record.getReplyTime() != null ? record.getReplyTime() : record.getCreateTime());
            if (!userContent.isEmpty()) {
                list.add(AiChatHistoryItemVo.builder()
                        .role("user")
                        .content(userContent)
                        .timestamp(createMs)
                        .build());
            }
            if (!aiContent.isEmpty()) {
                list.add(AiChatHistoryItemVo.builder()
                        .role("bot")
                        .content(aiContent)
                        .thinkingContent(record.getThinkingContent() != null && !record.getThinkingContent().isEmpty()
                                ? record.getThinkingContent() : null)
                        .modelLogoUrl(resolveModelLogo(record.getModelId()))
                        .timestamp(replyMs)
                        .build());
            }
        }
        list.sort((a, b) -> Long.compare(a.getTimestamp(), b.getTimestamp()));
        return list;
    }

    private void initContextFromDb(Long userId, String sessionId) {
        List<ChatMessage> messages = new java.util.ArrayList<>();
        AiChatSummary summary = aiChatSummaryService.getLatestByUserIdAndSessionId(userId, sessionId);
        if (summary != null && summary.getSummaryContent() != null && !summary.getSummaryContent().isEmpty()) {
            messages.add(SystemMessage.from("[之前的对话摘要]\n" + summary.getSummaryContent()));
        }
        Long afterId = summary != null ? summary.getCoveredUntilRecordId() : null;
        List<AiChatRecord> recentRecords = aiChatRecordService.listBySessionIdAfterId(userId, sessionId, afterId, RECENT_ROUNDS_KEEP);
        Collections.reverse(recentRecords);
        for (AiChatRecord record : recentRecords) {
            if (record.getUserMessage() != null && !record.getUserMessage().trim().isEmpty()) {
                messages.add(UserMessage.from(record.getUserMessage().trim()));
            }
            if (record.getModelReply() != null && !record.getModelReply().trim().isEmpty()) {
                messages.add(AiMessage.from(record.getModelReply().trim()));
            }
        }
        sessionMessageHistories.put(sessionCacheKey(userId, sessionId), messages);
    }

    private void maybeSummarize(Long userId, String sessionId, Long latestRecordId) {
        String cacheKey = sessionCacheKey(userId, sessionId);
        List<ChatMessage> history = sessionMessageHistories.get(cacheKey);
        if (history == null) {
            return;
        }
        long dialogMsgCount = history.stream()
                .filter(m -> m instanceof UserMessage || m instanceof AiMessage)
                .count();
        int rounds = (int) (dialogMsgCount / 2);
        if (rounds < SUMMARY_THRESHOLD_ROUNDS) {
            return;
        }
        int keepMsgCount = RECENT_ROUNDS_KEEP * 2;
        List<ChatMessage> dialogMessages = history.stream()
                .filter(m -> m instanceof UserMessage || m instanceof AiMessage)
                .collect(Collectors.toList());
        int toSummarizeCount = dialogMessages.size() - keepMsgCount;
        if (toSummarizeCount <= 0) {
            return;
        }

        List<ChatMessage> toSummarize = dialogMessages.subList(0, toSummarizeCount);
        List<ChatMessage> toKeep = dialogMessages.subList(toSummarizeCount, dialogMessages.size());
        StringBuilder summaryText = new StringBuilder();
        AiChatSummary existingSummary = aiChatSummaryService.getLatestByUserIdAndSessionId(userId, sessionId);
        if (existingSummary != null && existingSummary.getSummaryContent() != null
                && !existingSummary.getSummaryContent().isEmpty()) {
            summaryText.append(existingSummary.getSummaryContent()).append("\n\n");
        }
        summaryText.append("--- 最近对话要点 ---\n");
        for (ChatMessage m : toSummarize) {
            if (m instanceof UserMessage u) {
                String text = u.singleText();
                if (text.length() > 200) {
                    text = text.substring(0, 200) + "...";
                }
                summaryText.append("用户: ").append(text).append("\n");
            } else if (m instanceof AiMessage a) {
                String text = a.text();
                if (text.length() > 300) {
                    text = text.substring(0, 300) + "...";
                }
                summaryText.append("AI: ").append(text).append("\n");
            }
        }

        String finalSummary = summaryText.toString();
        if (finalSummary.length() > 3000) {
            finalSummary = finalSummary.substring(finalSummary.length() - 3000);
        }
        int totalRounds = (existingSummary != null ? existingSummary.getCoveredRounds() : 0) + toSummarizeCount / 2;
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
                    .sessionId(sessionId)
                    .summaryContent(finalSummary)
                    .coveredUntilRecordId(latestRecordId)
                    .coveredRounds(totalRounds)
                    .createTime(LocalDateTime.now())
                    .updateTime(LocalDateTime.now())
                    .build();
        }
        aiChatSummaryService.saveOrUpdate(summary);

        List<ChatMessage> newHistory = new java.util.ArrayList<>();
        newHistory.add(SystemMessage.from("[之前的对话摘要]\n" + finalSummary));
        newHistory.addAll(toKeep);
        sessionMessageHistories.put(cacheKey, newHistory);
    }

    private AiChatSessionVo toSessionVo(AiChatSession session) {
        return AiChatSessionVo.builder()
                .id(session.getId())
                .title(session.getTitle())
                .lastModelId(session.getLastModelId())
                .lastModelLogoUrl(resolveModelLogo(session.getLastModelId()))
                .messageCount(session.getMessageCount() != null ? session.getMessageCount() : 0)
                .lastMessagePreview(null)
                .lastMessageAt(toEpochMillis(session.getLastMessageAt() != null ? session.getLastMessageAt() : session.getUpdateTime()))
                .createTime(toEpochMillis(session.getCreateTime()))
                .build();
    }

    private String resolveModelLogo(Long modelId) {
        if (modelId == null) {
            return null;
        }
        AiModel model = aiModelService.getById(modelId);
        return model != null ? model.getLogoUrl() : null;
    }

    private String sessionCacheKey(Long userId, String sessionId) {
        return userId + ":" + sessionId;
    }

    private long toMemoryId(Long userId, String sessionId) {
        return Math.abs((userId + ":" + sessionId).hashCode());
    }

    private long toEpochMillis(LocalDateTime time) {
        if (time == null) {
            return System.currentTimeMillis();
        }
        return time.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }
}
