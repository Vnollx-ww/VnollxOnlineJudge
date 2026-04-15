package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.entity.AiChatRecord;
import com.example.vnollxonlinejudge.model.entity.AiChatSession;
import com.example.vnollxonlinejudge.model.entity.AiChatSummary;
import com.example.vnollxonlinejudge.model.entity.AiModel;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryItemVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryPageVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatSessionVo;
import com.example.vnollxonlinejudge.service.AiChatRecordService;
import com.example.vnollxonlinejudge.service.AiChatSessionService;
import com.example.vnollxonlinejudge.service.AiChatSummaryService;
import com.example.vnollxonlinejudge.service.AiModelService;
import com.example.vnollxonlinejudge.service.AiService;
import com.example.vnollxonlinejudge.service.ai.proxy.ProxyAiStreamingClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
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
    private final AiChatSessionService aiChatSessionService;
    private final ProxyAiStreamingClient proxyClient;
    private final Map<String, List<ProxyAiStreamingClient.ChatMessage>> sessionMessageHistories = new ConcurrentHashMap<>();

    @Value("${ai.proxy.domestic.url:http://111.230.105.54:8000}")
    private String proxyDomesticUrl;
    @Value("${ai.proxy.overseas.url:http://103.117.122.213:8000}")
    private String proxyOverseasUrl;

    public AiServiceImpl(AiModelService aiModelService,
                         AiChatRecordService aiChatRecordService,
                         AiChatSummaryService aiChatSummaryService,
                         AiChatSessionService aiChatSessionService,
                         ProxyAiStreamingClient proxyClient) {
        this.aiModelService = aiModelService;
        this.aiChatRecordService = aiChatRecordService;
        this.aiChatSummaryService = aiChatSummaryService;
        this.aiChatSessionService = aiChatSessionService;
        this.proxyClient = proxyClient;
    }

    /** 根据模型的 proxy_type 选择国内或国外代理地址 */
    private String resolveProxyBaseUrl(AiModel aiModel) {
        if (aiModel.getProxyType() != null && "domestic".equalsIgnoreCase(aiModel.getProxyType().trim())) {
            return proxyDomesticUrl;
        }
        return proxyOverseasUrl;
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

        AiModel aiModel = aiModelService.getById(modelId);
        long startMs = System.currentTimeMillis();
        Long recordModelId = aiModel.getId();

        if (!sessionMessageHistories.containsKey(cacheKey)) {
            initContextFromDb(userId, safeSessionId);
        }

        int historySize = sessionMessageHistories.getOrDefault(cacheKey, Collections.emptyList()).size();
        logger.info("[AI调用] userId={}, sessionId={}, modelId={}, modelName={}, historyMsgCount={}",
                userId, safeSessionId, aiModel.getId(), aiModel.getName(), historySize);

        return chatViaProxy(userId, safeSessionId, recordModelId, message, aiModel, startMs);
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

    private Flux<String> chatViaProxy(Long userId,
                                       String sessionId,
                                       Long recordModelId,
                                       String message,
                                       AiModel aiModel,
                                       long startMs) {
        if (aiModel.getApiKey() == null || aiModel.getApiKey().trim().isEmpty()) {
            return Flux.just("[ERROR] 该模型未配置 API Key");
        }

        String cacheKey = sessionCacheKey(userId, sessionId);
        List<ProxyAiStreamingClient.ChatMessage> history = sessionMessageHistories.getOrDefault(cacheKey, Collections.emptyList());
        List<ProxyAiStreamingClient.ChatMessage> messages = new ArrayList<>(history);
        messages.add(ProxyAiStreamingClient.userMessage(message));

        StringBuilder fullResponse = new StringBuilder();
        StringBuilder fullThinking = new StringBuilder();

        String proxyBaseUrl = resolveProxyBaseUrl(aiModel);
        return proxyClient.streamChat(
                        proxyBaseUrl,
                        aiModel.getName(),
                        aiModel.getApiKey().trim(),
                        messages,
                        userId,
                        null,
                        null
                )
                .doOnNext(token -> {
                    if (token.startsWith("[THINKING]")) {
                        fullThinking.append(token.substring(10));
                    } else if (!token.equals("[DONE]") && !token.startsWith("[ERROR]")) {
                        fullResponse.append(token);
                    }
                })
                .doOnComplete(() -> {
                    LocalDateTime now = LocalDateTime.now();
                    long latencyMs = System.currentTimeMillis() - startMs;
                    if (fullResponse.length() > 0) {
                        appendSuccessfulRound(userId, sessionId, message, fullResponse.toString(),
                                fullThinking.length() > 0 ? fullThinking.toString() : null,
                                recordModelId, latencyMs, now);
                    }
                })
                .doOnError(error -> {
                    LocalDateTime now = LocalDateTime.now();
                    long latencyMs = System.currentTimeMillis() - startMs;
                    appendFailedRound(userId, sessionId, message, recordModelId,
                            error.getMessage(), latencyMs, now);
                })
                .onErrorResume(e -> Flux.just("[ERROR] " + e.getMessage()));
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
        sessionMessageHistories.computeIfAbsent(cacheKey, key -> new ArrayList<>());
        sessionMessageHistories.get(cacheKey).add(ProxyAiStreamingClient.userMessage(userMessage));
        sessionMessageHistories.get(cacheKey).add(ProxyAiStreamingClient.assistantMessage(botMessage));

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
        List<ProxyAiStreamingClient.ChatMessage> messages = new ArrayList<>();
        AiChatSummary summary = aiChatSummaryService.getLatestByUserIdAndSessionId(userId, sessionId);
        if (summary != null && summary.getSummaryContent() != null && !summary.getSummaryContent().isEmpty()) {
            messages.add(ProxyAiStreamingClient.systemMessage("[之前的对话摘要]\n" + summary.getSummaryContent()));
        }
        Long afterId = summary != null ? summary.getCoveredUntilRecordId() : null;
        List<AiChatRecord> recentRecords = aiChatRecordService.listBySessionIdAfterId(userId, sessionId, afterId, RECENT_ROUNDS_KEEP);
        Collections.reverse(recentRecords);
        for (AiChatRecord record : recentRecords) {
            if (record.getUserMessage() != null && !record.getUserMessage().trim().isEmpty()) {
                messages.add(ProxyAiStreamingClient.userMessage(record.getUserMessage().trim()));
            }
            if (record.getModelReply() != null && !record.getModelReply().trim().isEmpty()) {
                messages.add(ProxyAiStreamingClient.assistantMessage(record.getModelReply().trim()));
            }
        }
        sessionMessageHistories.put(sessionCacheKey(userId, sessionId), messages);
    }

    private void maybeSummarize(Long userId, String sessionId, Long latestRecordId) {
        String cacheKey = sessionCacheKey(userId, sessionId);
        List<ProxyAiStreamingClient.ChatMessage> history = sessionMessageHistories.get(cacheKey);
        if (history == null) {
            return;
        }
        long dialogMsgCount = history.stream()
                .filter(m -> "user".equals(m.getRole()) || "assistant".equals(m.getRole()))
                .count();
        int rounds = (int) (dialogMsgCount / 2);
        if (rounds < SUMMARY_THRESHOLD_ROUNDS) {
            return;
        }
        int keepMsgCount = RECENT_ROUNDS_KEEP * 2;
        List<ProxyAiStreamingClient.ChatMessage> dialogMessages = history.stream()
                .filter(m -> "user".equals(m.getRole()) || "assistant".equals(m.getRole()))
                .collect(Collectors.toList());
        int toSummarizeCount = dialogMessages.size() - keepMsgCount;
        if (toSummarizeCount <= 0) {
            return;
        }

        List<ProxyAiStreamingClient.ChatMessage> toSummarize = dialogMessages.subList(0, toSummarizeCount);
        List<ProxyAiStreamingClient.ChatMessage> toKeep = dialogMessages.subList(toSummarizeCount, dialogMessages.size());
        StringBuilder summaryText = new StringBuilder();
        AiChatSummary existingSummary = aiChatSummaryService.getLatestByUserIdAndSessionId(userId, sessionId);
        if (existingSummary != null && existingSummary.getSummaryContent() != null
                && !existingSummary.getSummaryContent().isEmpty()) {
            summaryText.append(existingSummary.getSummaryContent()).append("\n\n");
        }
        summaryText.append("--- 最近对话要点 ---\n");
        for (ProxyAiStreamingClient.ChatMessage m : toSummarize) {
            String text = m.getContent();
            if ("user".equals(m.getRole())) {
                if (text.length() > 200) {
                    text = text.substring(0, 200) + "...";
                }
                summaryText.append("用户: ").append(text).append("\n");
            } else if ("assistant".equals(m.getRole())) {
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

        List<ProxyAiStreamingClient.ChatMessage> newHistory = new ArrayList<>();
        newHistory.add(ProxyAiStreamingClient.systemMessage("[之前的对话摘要]\n" + finalSummary));
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
