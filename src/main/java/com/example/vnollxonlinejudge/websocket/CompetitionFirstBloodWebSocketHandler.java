package com.example.vnollxonlinejudge.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.jetbrains.annotations.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class CompetitionFirstBloodWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(CompetitionFirstBloodWebSocketHandler.class);
    private static final Map<Long, List<WebSocketSession>> competitionSessions = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;

    @Autowired
    public CompetitionFirstBloodWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(@NotNull WebSocketSession session) throws Exception {
        Long cid = getCidFromSession(session);
        if (cid != null) {
            competitionSessions.computeIfAbsent(cid, k -> new CopyOnWriteArrayList<>()).add(session);
            logger.info("[CompetitionFirstBloodWS] 连接建立: cid={}, 当前连接数={}", cid, competitionSessions.get(cid).size());
        } else {
            session.close(CloseStatus.BAD_DATA);
        }
    }

    @Override
    public void afterConnectionClosed(@NotNull WebSocketSession session, @NotNull CloseStatus status) throws Exception {
        Long cid = getCidFromSession(session);
        if (cid != null) {
            List<WebSocketSession> sessions = competitionSessions.get(cid);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    competitionSessions.remove(cid);
                }
                logger.info("[CompetitionFirstBloodWS] 连接关闭: cid={}, 剩余连接数={}", cid, sessions.size());
            }
        }
    }

    @Override
    protected void handleTextMessage(@NotNull WebSocketSession session, @NotNull TextMessage message) throws Exception {
        if (message.getPayload().contains("\"type\":\"ping\"")) {
            session.sendMessage(new TextMessage("{\"type\":\"pong\"}"));
        }
    }

    public void sendFirstBlood(Long cid, Long pid, String problemLabel, String problemTitle, String participantName) {
        List<WebSocketSession> sessions = competitionSessions.get(cid);
        if (sessions == null || sessions.isEmpty()) {
            logger.debug("[CompetitionFirstBloodWS] 比赛无活跃连接: cid={}", cid);
            return;
        }
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("type", "first_blood");
            data.put("competitionId", cid);
            data.put("problemId", pid);
            data.put("problemLabel", problemLabel);
            data.put("problemTitle", problemTitle);
            data.put("participantName", participantName);
            data.put("message", participantName + " 拿下《" + problemLabel + ". " + problemTitle + "》一血！");
            String json = objectMapper.writeValueAsString(data);
            int sentCount = 0;
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(new TextMessage(json));
                        sentCount++;
                    } catch (IOException e) {
                        logger.error("[CompetitionFirstBloodWS] 发送一血消息失败: {}", e.getMessage());
                    }
                }
            }
            logger.info("[CompetitionFirstBloodWS] 一血已推送: cid={}, pid={}, 发送到 {} 个连接", cid, pid, sentCount);
        } catch (Exception e) {
            logger.error("[CompetitionFirstBloodWS] 序列化一血消息失败: {}", e.getMessage());
        }
    }

    private Long getCidFromSession(WebSocketSession session) {
        try {
            URI uri = session.getUri();
            if (uri != null && uri.getQuery() != null) {
                for (String param : uri.getQuery().split("&")) {
                    String[] pair = param.split("=");
                    if (pair.length == 2 && "cid".equals(pair[0])) {
                        return Long.parseLong(pair[1]);
                    }
                }
            }
        } catch (Exception e) {
            logger.error("[CompetitionFirstBloodWS] 解析cid失败: {}", e.getMessage());
        }
        return null;
    }
}
