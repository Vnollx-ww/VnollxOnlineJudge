package com.example.vnollxonlinejudge.config;

import com.example.vnollxonlinejudge.websocket.JudgeWebSocketHandler;
import com.example.vnollxonlinejudge.websocket.MessageWebSocketHandler;
import com.example.vnollxonlinejudge.websocket.NotificationWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final JudgeWebSocketHandler judgeWebSocketHandler;
    private final NotificationWebSocketHandler notificationWebSocketHandler;
    private final MessageWebSocketHandler messageWebSocketHandler;

    @Autowired
    public WebSocketConfig(JudgeWebSocketHandler judgeWebSocketHandler,
                          NotificationWebSocketHandler notificationWebSocketHandler,
                          MessageWebSocketHandler messageWebSocketHandler) {
        this.judgeWebSocketHandler = judgeWebSocketHandler;
        this.notificationWebSocketHandler = notificationWebSocketHandler;
        this.messageWebSocketHandler = messageWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(judgeWebSocketHandler, "/ws/judge")
                .setAllowedOriginPatterns("*");
        registry.addHandler(notificationWebSocketHandler, "/ws/notification")
                .setAllowedOriginPatterns("*");
        registry.addHandler(messageWebSocketHandler, "/ws/message")
                .setAllowedOriginPatterns("*");
    }

    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        // 0 = 无超时限制，只要页面开着就保持连接
        container.setMaxSessionIdleTimeout(0L);
        return container;
    }
}
