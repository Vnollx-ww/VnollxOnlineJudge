package com.example.vnollxonlinejudge.config;

import com.example.vnollxonlinejudge.websocket.JudgeWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final JudgeWebSocketHandler judgeWebSocketHandler;

    @Autowired
    public WebSocketConfig(JudgeWebSocketHandler judgeWebSocketHandler) {
        this.judgeWebSocketHandler = judgeWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(judgeWebSocketHandler, "/ws/judge")
                .setAllowedOriginPatterns("*"); // Allow cross-origin for development using patterns
    }
}
