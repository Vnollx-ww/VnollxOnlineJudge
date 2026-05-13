package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.vnollxonlinejudge.mapper.AiChatRecordMapper;
import com.example.vnollxonlinejudge.mapper.AiChatSessionMapper;
import com.example.vnollxonlinejudge.model.entity.AiChatRecord;
import com.example.vnollxonlinejudge.model.entity.AiChatSession;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.vo.ai.AdminAiModelConversationVo;
import com.example.vnollxonlinejudge.service.AdminAiModelConversationService;
import com.example.vnollxonlinejudge.service.UserService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AdminAiModelConversationServiceImpl implements AdminAiModelConversationService {
    private final AiChatRecordMapper aiChatRecordMapper;
    private final AiChatSessionMapper aiChatSessionMapper;
    private final UserService userService;

    public AdminAiModelConversationServiceImpl(
            AiChatRecordMapper aiChatRecordMapper,
            AiChatSessionMapper aiChatSessionMapper,
            UserService userService
    ) {
        this.aiChatRecordMapper = aiChatRecordMapper;
        this.aiChatSessionMapper = aiChatSessionMapper;
        this.userService = userService;
    }

    @Override
    public AdminAiModelConversationVo getConversationsByModelId(Long modelId) {
        List<AiChatRecord> records = aiChatRecordMapper.selectList(
                new LambdaQueryWrapper<AiChatRecord>()
                        .eq(AiChatRecord::getModelId, modelId)
                        .orderByDesc(AiChatRecord::getCreateTime)
                        .orderByDesc(AiChatRecord::getId)
        );
        if (records == null || records.isEmpty()) {
            return AdminAiModelConversationVo.builder()
                    .modelId(modelId)
                    .userCount(0)
                    .sessionCount(0)
                    .recordCount(0)
                    .users(List.of())
                    .build();
        }

        Set<Long> userIds = records.stream().map(AiChatRecord::getUserId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, User> userMap = userService.getUsersByIds(userIds).stream().collect(Collectors.toMap(User::getId, item -> item, (a, b) -> a));
        Set<String> sessionIds = records.stream().map(AiChatRecord::getSessionId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, AiChatSession> sessionMap = listSessionsByIds(sessionIds).stream().collect(Collectors.toMap(AiChatSession::getId, item -> item, (a, b) -> a));

        Map<Long, List<AiChatRecord>> byUser = records.stream()
                .filter(item -> item.getUserId() != null)
                .collect(Collectors.groupingBy(AiChatRecord::getUserId, LinkedHashMap::new, Collectors.toList()));
        List<AdminAiModelConversationVo.UserGroup> users = new ArrayList<>();
        for (Map.Entry<Long, List<AiChatRecord>> userEntry : byUser.entrySet()) {
            Long userId = userEntry.getKey();
            List<AiChatRecord> userRecords = userEntry.getValue();
            User user = userMap.get(userId);
            List<AdminAiModelConversationVo.SessionGroup> sessions = buildSessionGroups(userRecords, sessionMap);
            users.add(AdminAiModelConversationVo.UserGroup.builder()
                    .userId(userId)
                    .userName(user != null ? user.getName() : "用户 " + userId)
                    .email(user != null ? user.getEmail() : null)
                    .avatar(user != null ? user.getAvatar() : null)
                    .sessionCount(sessions.size())
                    .recordCount(userRecords.size())
                    .lastActiveAt(toEpochMillis(maxTime(userRecords)))
                    .sessions(sessions)
                    .build());
        }
        users.sort(Comparator.comparing(AdminAiModelConversationVo.UserGroup::getLastActiveAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return AdminAiModelConversationVo.builder()
                .modelId(modelId)
                .userCount(users.size())
                .sessionCount(users.stream().mapToInt(AdminAiModelConversationVo.UserGroup::getSessionCount).sum())
                .recordCount(records.size())
                .users(users)
                .build();
    }

    private List<AdminAiModelConversationVo.SessionGroup> buildSessionGroups(
            List<AiChatRecord> userRecords,
            Map<String, AiChatSession> sessionMap
    ) {
        Map<String, List<AiChatRecord>> bySession = userRecords.stream()
                .collect(Collectors.groupingBy(item -> item.getSessionId() != null ? item.getSessionId() : "未归档会话", LinkedHashMap::new, Collectors.toList()));
        List<AdminAiModelConversationVo.SessionGroup> sessions = new ArrayList<>();
        for (Map.Entry<String, List<AiChatRecord>> sessionEntry : bySession.entrySet()) {
            List<AiChatRecord> sessionRecords = sessionEntry.getValue();
            AiChatSession session = sessionMap.get(sessionEntry.getKey());
            List<AdminAiModelConversationVo.RecordItem> recordItems = sessionRecords.stream()
                    .sorted(Comparator.comparing(AiChatRecord::getCreateTime, Comparator.nullsLast(Comparator.naturalOrder())))
                    .map(this::toRecordItem)
                    .collect(Collectors.toList());
            sessions.add(AdminAiModelConversationVo.SessionGroup.builder()
                    .sessionId(sessionEntry.getKey())
                    .title(session != null ? session.getTitle() : "未归档会话")
                    .recordCount(sessionRecords.size())
                    .lastActiveAt(toEpochMillis(maxTime(sessionRecords)))
                    .records(recordItems)
                    .build());
        }
        sessions.sort(Comparator.comparing(AdminAiModelConversationVo.SessionGroup::getLastActiveAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return sessions;
    }

    private List<AiChatSession> listSessionsByIds(Collection<String> sessionIds) {
        if (sessionIds == null || sessionIds.isEmpty()) {
            return List.of();
        }
        return aiChatSessionMapper.selectList(new LambdaQueryWrapper<AiChatSession>().in(AiChatSession::getId, sessionIds));
    }

    private AdminAiModelConversationVo.RecordItem toRecordItem(AiChatRecord record) {
        return AdminAiModelConversationVo.RecordItem.builder()
                .id(record.getId())
                .userMessage(record.getUserMessage())
                .modelReply(record.getModelReply())
                .thinkingContent(record.getThinkingContent())
                .promptTokens(record.getPromptTokens())
                .completionTokens(record.getCompletionTokens())
                .totalTokens(record.getTotalTokens())
                .latencyMs(record.getLatencyMs())
                .status(record.getStatus())
                .errorMessage(record.getErrorMessage())
                .createTime(toEpochMillis(record.getCreateTime()))
                .replyTime(toEpochMillis(record.getReplyTime()))
                .build();
    }

    private LocalDateTime maxTime(List<AiChatRecord> records) {
        return records.stream()
                .map(item -> item.getReplyTime() != null ? item.getReplyTime() : item.getCreateTime())
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }

    private Long toEpochMillis(LocalDateTime time) {
        return time == null ? null : time.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }
}
