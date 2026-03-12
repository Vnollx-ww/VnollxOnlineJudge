package com.example.vnollxonlinejudge.websocket;

import com.example.vnollxonlinejudge.service.AiService;
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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AiWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(AiWebSocketHandler.class);

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @Autowired
    public AiWebSocketHandler(AiService aiService, ObjectMapper objectMapper) {
        this.aiService = aiService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(@NotNull WebSocketSession session) {
        Long uid = getUidFromSession(session);
        if (uid != null) {
            sessions.put(session.getId(), session);
            session.getAttributes().put("uid", uid);
            logger.info("[AiWS] 连接建立: uid={}, sessionId={}", uid, session.getId());
        } else {
            try {
                session.close(CloseStatus.BAD_DATA);
            } catch (IOException e) {
                logger.error("[AiWS] 关闭连接失败: {}", e.getMessage());
            }
        }
    }

    @Override
    public void afterConnectionClosed(@NotNull WebSocketSession session, @NotNull CloseStatus status) {
        sessions.remove(session.getId());
        Long uid = (Long) session.getAttributes().get("uid");
        logger.info("[AiWS] 连接关闭: uid={}, sessionId={}", uid, session.getId());
    }

    @Override
    protected void handleTextMessage(@NotNull WebSocketSession session, @NotNull TextMessage message) {
        String payload = message.getPayload();
        Long uid = (Long) session.getAttributes().get("uid");

        if (uid == null) {
            sendError(session, "未认证");
            return;
        }

        // 处理 ping
        if (payload.contains("\"type\":\"ping\"")) {
            sendMessage(session, "{\"type\":\"pong\"}");
            return;
        }

        try {
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);
            String type = (String) data.get("type");

            if ("chat".equals(type)) {
                String userMessage = (String) data.get("message");
                if (userMessage == null || userMessage.trim().isEmpty()) {
                    sendError(session, "消息不能为空");
                    return;
                }

                logger.info("[AiWS] 收到消息: uid={}, message={}", uid, userMessage);

                // 发送开始标记
                sendJsonMessage(session, Map.of("type", "start"));

                // 流式发送 AI 响应
                aiService.chat(uid, userMessage)
                        .filter(token -> !token.equals("[DONE]") && !token.startsWith("[ERROR]"))
                        .doOnNext(token -> {
                            // 直接发送 token，WebSocket 不需要编码换行符
                            sendJsonMessage(session, Map.of("type", "token", "content", token));
                        })
                        .doOnComplete(() -> {
                            sendJsonMessage(session, Map.of("type", "done"));
                            logger.info("[AiWS] 响应完成: uid={}", uid);
                        })
                        .doOnError(error -> {
                            logger.error("[AiWS] AI错误: uid={}, error={}", uid, error.getMessage());
                            sendJsonMessage(session, Map.of("type", "error", "message", error.getMessage()));
                        })
                        .subscribe();

            } else if ("clear".equals(type)) {
                aiService.clearMemory(uid);
                sendJsonMessage(session, Map.of("type", "cleared"));
                logger.info("[AiWS] 记忆已清除: uid={}", uid);
            }

        } catch (Exception e) {
            logger.error("[AiWS] 处理消息失败: {}", e.getMessage(), e);
            sendError(session, "处理失败: " + e.getMessage());
        }
    }

    private void sendMessage(WebSocketSession session, String message) {
        if (session.isOpen()) {
            try {
                session.sendMessage(new TextMessage(message));
            } catch (IOException e) {
                logger.error("[AiWS] 发送消息失败: {}", e.getMessage());
            }
        }
    }

    private void sendJsonMessage(WebSocketSession session, Map<String, Object> data) {
        try {
            String json = objectMapper.writeValueAsString(data);
            sendMessage(session, json);
        } catch (Exception e) {
            logger.error("[AiWS] JSON序列化失败: {}", e.getMessage());
        }
    }

    private void sendError(WebSocketSession session, String error) {
        sendJsonMessage(session, Map.of("type", "error", "message", error));
    }

    private Long getUidFromSession(WebSocketSession session) {
        try {
            URI uri = session.getUri();
            if (uri != null && uri.getQuery() != null) {
                String query = uri.getQuery();
                for (String param : query.split("&")) {
                    String[] pair = param.split("=");
                    if (pair.length == 2 && "uid".equals(pair[0])) {
                        return Long.parseLong(pair[1]);
                    }
                }
            }
        } catch (Exception e) {
            logger.error("[AiWS] 解析uid失败: {}", e.getMessage());
        }
        return null;
    }
}
