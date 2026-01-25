package com.example.vnollxonlinejudge.websocket;

import com.example.vnollxonlinejudge.model.vo.friend.PrivateMessageVo;
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
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class MessageWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(MessageWebSocketHandler.class);
    
    private static final Map<Long, List<WebSocketSession>> userSessions = new ConcurrentHashMap<>();
    
    private final ObjectMapper objectMapper;
    
    @Autowired
    public MessageWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(@NotNull WebSocketSession session) throws Exception {
        Long uid = getUidFromSession(session);
        if (uid != null) {
            userSessions.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(session);
            logger.info("[MessageWS] 连接建立: uid={}, 当前连接数={}", uid, userSessions.get(uid).size());
        } else {
            session.close(CloseStatus.BAD_DATA);
        }
    }

    @Override
    public void afterConnectionClosed(@NotNull WebSocketSession session, @NotNull CloseStatus status) throws Exception {
        Long uid = getUidFromSession(session);
        if (uid != null) {
            List<WebSocketSession> sessions = userSessions.get(uid);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    userSessions.remove(uid);
                }
                logger.info("[MessageWS] 连接关闭: uid={}, 剩余连接数={}", uid, sessions.size());
            }
        }
    }

    @Override
    protected void handleTextMessage(@NotNull WebSocketSession session, @NotNull TextMessage message) throws Exception {
        String payload = message.getPayload();
        if (payload.contains("\"type\":\"ping\"")) {
            session.sendMessage(new TextMessage("{\"type\":\"pong\"}"));
        }
    }

    public void sendMessageToUser(Long uid, PrivateMessageVo message) {
        List<WebSocketSession> sessions = userSessions.get(uid);
        if (sessions != null && !sessions.isEmpty()) {
            try {
                String jsonMessage = objectMapper.writeValueAsString(message);
                for (WebSocketSession session : sessions) {
                    if (session.isOpen()) {
                        try {
                            session.sendMessage(new TextMessage(jsonMessage));
                        } catch (IOException e) {
                            logger.error("[MessageWS] 发送消息失败: {}", e.getMessage());
                        }
                    }
                }
                logger.info("[MessageWS] 私信已推送: to={}, from={}", uid, message.getSenderId());
            } catch (Exception e) {
                logger.error("[MessageWS] 序列化消息失败: {}", e.getMessage());
            }
        }
    }
    
    public void sendFriendRequestNotification(Long uid, Map<String, Object> notification) {
        List<WebSocketSession> sessions = userSessions.get(uid);
        if (sessions != null && !sessions.isEmpty()) {
            try {
                String jsonMessage = objectMapper.writeValueAsString(notification);
                for (WebSocketSession session : sessions) {
                    if (session.isOpen()) {
                        try {
                            session.sendMessage(new TextMessage(jsonMessage));
                        } catch (IOException e) {
                            logger.error("[MessageWS] 发送好友通知失败: {}", e.getMessage());
                        }
                    }
                }
                logger.info("[MessageWS] 好友通知已推送: to={}, type={}", uid, notification.get("type"));
            } catch (Exception e) {
                logger.error("[MessageWS] 序列化通知失败: {}", e.getMessage());
            }
        }
    }

    public boolean isUserOnline(Long uid) {
        List<WebSocketSession> sessions = userSessions.get(uid);
        return sessions != null && !sessions.isEmpty();
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
            logger.error("[MessageWS] 解析uid失败: {}", e.getMessage());
        }
        return null;
    }
}
