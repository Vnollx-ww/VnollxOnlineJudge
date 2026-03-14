package com.example.vnollxonlinejudge.service.ai.proxy;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Python AI 代理客户端
 * 调用 Python 代理的 /v1/chat/stream/tools 端点实现流式对话
 */
@Component
public class ProxyAiStreamingClient {
    private static final Logger logger = LoggerFactory.getLogger(ProxyAiStreamingClient.class);

    private final WebClient webClient;

    @Value("${ai.proxy.url:http://localhost:8000}")
    private String proxyUrl;

    @Value("${ai.proxy.timeout:300}")
    private int timeoutSeconds;

    public ProxyAiStreamingClient(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();
    }

    public static class ChatMessage {
        private String role;
        private String content;

        public ChatMessage() {}

        public ChatMessage(String role, String content) {
            this.role = role;
            this.content = content;
        }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }

    public interface StreamCallback {
        void onThinkingToken(String token);
        void onContentToken(String token);
        void onComplete();
        void onError(Throwable t);
    }

    /**
     * 流式对话（带工具调用）
     */
    public Flux<String> streamChat(
            String model,
            String apiKey,
            List<ChatMessage> messages,
            Long currentUserId,
            Double temperature,
            Integer maxTokens
    ) {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("api_key", apiKey);

        List<Map<String, String>> msgList = new ArrayList<>();
        for (ChatMessage msg : messages) {
            Map<String, String> m = new HashMap<>();
            m.put("role", msg.getRole());
            m.put("content", msg.getContent());
            msgList.add(m);
        }
        requestBody.put("messages", msgList);

        requestBody.put("enable_tools", true);
        if (currentUserId != null) {
            requestBody.put("current_user_id", currentUserId);
        }
        if (temperature != null) {
            requestBody.put("temperature", temperature);
        }
        if (maxTokens != null && maxTokens > 0) {
            requestBody.put("max_tokens", maxTokens);
        }
        requestBody.put("timeout", (double) timeoutSeconds);

        String url = proxyUrl + "/v1/chat/stream/tools";
        logger.info("[ProxyAI] 调用代理: url={}, model={}", url, model);

        ParameterizedTypeReference<ServerSentEvent<String>> typeRef =
                new ParameterizedTypeReference<>() {};

        return webClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .bodyValue(JSON.toJSONString(requestBody))
                .retrieve()
                .onStatus(HttpStatusCode::isError, response ->
                        response.bodyToMono(String.class)
                                .defaultIfEmpty("")
                                .flatMap(body -> {
                                    logger.error("[ProxyAI] 代理返回错误: status={}, body={}",
                                            response.statusCode().value(), body);
                                    return Mono.error(new WebClientResponseException(
                                            "Proxy request failed: " + response.statusCode().value() + ", body=" + body,
                                            response.statusCode().value(),
                                            response.statusCode().toString(),
                                            null,
                                            body.getBytes(),
                                            null
                                    ));
                                })
                )
                .bodyToFlux(typeRef)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .map(sse -> parseSseEvent(sse.data()))
                .filter(event -> event != null && !event.isEmpty())
                .doOnError(e -> logger.error("[ProxyAI] 请求失败: {}", e.getMessage()));
    }

    private String parseSseEvent(String data) {
        if (data == null || data.isEmpty()) {
            return "";
        }

        try {
            JSONObject event = JSON.parseObject(data);
            String type = event.getString("type");

            if ("content".equals(type)) {
                return event.getString("delta");
            } else if ("thinking".equals(type)) {
                return "[THINKING]" + event.getString("delta");
            } else if ("error".equals(type)) {
                return "[ERROR]" + event.getString("message");
            } else if ("done".equals(type)) {
                return "[DONE]";
            } else if ("meta".equals(type)) {
                logger.info("[ProxyAI] meta: provider={}, model={}",
                        event.getString("provider"), event.getString("model"));
                return "";
            }
        } catch (Exception e) {
            logger.warn("[ProxyAI] 解析SSE事件失败: {}", data);
        }
        return "";
    }

    /**
     * 构建用户消息
     */
    public static ChatMessage userMessage(String content) {
        return new ChatMessage("user", content);
    }

    /**
     * 构建助手消息
     */
    public static ChatMessage assistantMessage(String content) {
        return new ChatMessage("assistant", content);
    }

    /**
     * 构建系统消息
     */
    public static ChatMessage systemMessage(String content) {
        return new ChatMessage("system", content);
    }
}
