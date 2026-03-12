package com.example.vnollxonlinejudge.websocket;

import com.example.vnollxonlinejudge.model.vo.friend.FriendVo;
import com.example.vnollxonlinejudge.model.vo.friend.PrivateMessageVo;
import com.example.vnollxonlinejudge.service.FriendService;
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
public class MessageWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(MessageWebSocketHandler.class);
    
    private static final Map<Long, List<WebSocketSession>> userSessions = new ConcurrentHashMap<>();
    
    private final ObjectMapper objectMapper;
    private FriendService friendService;
    
    @Autowired
    public MessageWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }
    
    @Autowired
    public void setFriendService(FriendService friendService) {
        this.friendService = friendService;
    }

    @Override
    public void afterConnectionEstablished(@NotNull WebSocketSession session) throws Exception {
        Long uid = getUidFromSession(session);
        if (uid != null) {
            boolean wasOffline = !isUserOnline(uid);
            userSessions.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(session);
            logger.info("[MessageWS] 连接建立: uid={}, 当前连接数={}", uid, userSessions.get(uid).size());
            // 如果用户从离线变为在线，通知所有好友
            if (wasOffline) {
                notifyFriendsOnlineStatus(uid, true);
            }
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
                    // 用户完全离线，通知所有好友
                    notifyFriendsOnlineStatus(uid, false);
                }
                logger.info("[MessageWS] 连接关闭: uid={}, 剩余连接数={}", uid, sessions.size());
            }
        }
    }

    @Override
    protected void handleTextMessage(@NotNull WebSocketSession session, @NotNull TextMessage message) throws Exception {
        String payload = message.getPayload();
        logger.info("[MessageWS] received: {}", payload);
        
        if (payload.contains("\"type\":\"ping\"")) {
            session.sendMessage(new TextMessage("{\"type\":\"pong\"}"));
            return;
        }
        
        try {
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);
            String type = (String) data.get("type");
            logger.info("[MessageWS] type={}, data={}", type, data);
            
            if ("typing".equals(type)) {
                Long fromUid = getUidFromSession(session);
                Object toUidObj = data.get("toUid");
                Long toUid = toUidObj instanceof Number ? ((Number) toUidObj).longValue() : Long.parseLong(toUidObj.toString());
                logger.info("[MessageWS] typing: from={} to={}", fromUid, toUid);
                
                Map<String, Object> typingNotification = new HashMap<>();
                typingNotification.put("type", "typing");
                typingNotification.put("fromUid", fromUid);
                typingNotification.put("isTyping", data.get("isTyping"));
                
                sendNotificationToUser(toUid, typingNotification);
            } else if ("message_read".equals(type)) {
                Long fromUid = getUidFromSession(session);
                Object toUidObj = data.get("toUid");
                Long toUid = toUidObj instanceof Number ? ((Number) toUidObj).longValue() : Long.parseLong(toUidObj.toString());
                logger.info("[MessageWS] message_read: from={} to={}", fromUid, toUid);
                
                Map<String, Object> readNotification = new HashMap<>();
                readNotification.put("type", "message_read");
                readNotification.put("fromUid", fromUid);
                
                sendNotificationToUser(toUid, readNotification);
            }
        } catch (Exception e) {
            logger.error("[MessageWS] handle error: {}", e.getMessage(), e);
        }
    }
    
    private void sendNotificationToUser(Long uid, Map<String, Object> notification) {
        logger.info("[MessageWS] sendNotificationToUser: uid={}, online users={}", uid, userSessions.keySet());
        List<WebSocketSession> sessions = userSessions.get(uid);
        if (sessions != null && !sessions.isEmpty()) {
            try {
                String jsonMessage = objectMapper.writeValueAsString(notification);
                logger.info("[MessageWS] sending to uid={}: {}", uid, jsonMessage);
                for (WebSocketSession session : sessions) {
                    if (session.isOpen()) {
                        try {
                            session.sendMessage(new TextMessage(jsonMessage));
                        } catch (IOException e) {
                            logger.error("[MessageWS] 发送通知失败: {}", e.getMessage());
                        }
                    }
                }
            } catch (Exception e) {
                logger.error("[MessageWS] 序列化通知失败: {}", e.getMessage());
            }
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
        boolean online = sessions != null && !sessions.isEmpty();
        logger.info("[MessageWS] isUserOnline check: uid={}, online={}, allOnlineUsers={}", uid, online, userSessions.keySet());
        return online;
    }
    
    private void notifyFriendsOnlineStatus(Long uid, boolean isOnline) {
        if (friendService == null) {
            logger.warn("[MessageWS] friendService is null, cannot notify online status");
            return;
        }
        try {
            List<FriendVo> friends = friendService.getFriendList(uid);
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "online_status");
            notification.put("userId", uid);
            notification.put("isOnline", isOnline);
            
            for (FriendVo friend : friends) {
                sendNotificationToUser(friend.getUserId(), notification);
            }
            logger.info("[MessageWS] 已通知{}位好友用户{}的在线状态: {}", friends.size(), uid, isOnline);
        } catch (Exception e) {
            logger.error("[MessageWS] 通知好友在线状态失败: {}", e.getMessage(), e);
        }
    }

    private Long getUidFromSession(WebSocketSession session) {
        try {
            URI uri = session.getUri();
            if (uri != null) {
                String path = uri.getPath();
                String query = uri.getQuery();
                
                // 优先从路径解析: /ws/message/{uid}
                if (path != null && path.startsWith("/ws/message/")) {
                    String uidStr = path.substring("/ws/message/".length());
                    if (!uidStr.isEmpty()) {
                        return Long.parseLong(uidStr);
                    }
                }
                
                // 其次从查询参数解析: /ws/message?uid=xxx
                if (query != null) {
                    for (String param : query.split("&")) {
                        String[] pair = param.split("=");
                        if (pair.length == 2 && "uid".equals(pair[0])) {
                            return Long.parseLong(pair[1]);
                        }
                    }
                }
            }
        } catch (Exception e) {
            logger.error("[MessageWS] 解析uid失败: {}", e.getMessage());
        }
        return null;
    }
}
