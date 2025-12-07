package com.example.vnollxonlinejudge.websocket;

import com.example.vnollxonlinejudge.service.serviceImpl.JudgeServiceImpl;
import org.jetbrains.annotations.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
public class JudgeWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(JudgeWebSocketHandler.class);
    // 线程安全的用户会话映射: uid -> 会话列表（支持多标签页）
    private static final Map<Long, List<WebSocketSession>> userSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(@NotNull WebSocketSession session) throws Exception {
        Long uid = getUidFromSession(session);
        if (uid != null) {
            userSessions.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(session);
            //logger.info("WebSocket 连接建立: uid={}, 当前连接数={}", uid, userSessions.get(uid).size());
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
                int remaining = sessions.size();
                if (sessions.isEmpty()) {
                    userSessions.remove(uid);
                }
                //logger.info("WebSocket 连接关闭: uid={}, 剩余连接数={}, 关闭原因={}", uid, remaining, status);
            }
        }
    }

    public void sendMessageToUser(Long uid, String message) {
        List<WebSocketSession> sessions = userSessions.get(uid);
        if (sessions != null && !sessions.isEmpty()) {
            int sentCount = 0;
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(new TextMessage(message));
                        sentCount++;
                    } catch (IOException e) {
                        logger.error("发送消息失败: {}", e.getMessage());
                    }
                }
            }
            logger.info("WebSocket 消息已发送: uid={}, 发送到 {} 个连接", uid, sentCount);
        } else {
            logger.warn("WebSocket 发送失败: uid={} 无活跃连接", uid);
        }
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
            return null;
        }
        return null;
    }
}
