package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.service.AiService;
import com.example.vnollxonlinejudge.service.ai.OjAssistant;
import com.example.vnollxonlinejudge.service.ai.OjTools;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.TokenStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import jakarta.annotation.PostConstruct;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AiServiceImpl implements AiService {
    private static final Logger logger = LoggerFactory.getLogger(AiServiceImpl.class);
    private final OpenAiStreamingChatModel streamingModel;
    private final OjTools ojTools;
    private final Map<Long, List<ChatMessage>> userMessageHistories;
    private OjAssistant assistant;

    public AiServiceImpl(OpenAiStreamingChatModel streamingModel, OjTools ojTools) {
        this.streamingModel = streamingModel;
        this.ojTools = ojTools;
        this.userMessageHistories = new ConcurrentHashMap<>();
    }

    @PostConstruct
    public void init() {
        // 构建AI助手，注册工具
        this.assistant = AiServices.builder(OjAssistant.class)
                .streamingChatLanguageModel(streamingModel)
                .chatMemoryProvider(memoryId -> MessageWindowChatMemory.withMaxMessages(15))
                .tools(ojTools)
                .build();
        logger.info("AI助手初始化完成，已注册OJ工具集");
    }

    @Override
    public Flux<String> chat(Long userId, String message) {
        // 设置当前用户ID，供工具使用
        ojTools.setCurrentUserId(userId);

        return Flux.create(sink -> {
            try {
                // 使用AI助手进行流式对话（自动处理工具调用）
                TokenStream tokenStream = assistant.chat(userId, message);
                
                StringBuilder fullResponse = new StringBuilder();
                
                tokenStream
                    .onNext(token -> {
                        fullResponse.append(token);
                        sink.next(token);
                    })
                    .onComplete(response -> {
                        // 记录消息历史
                        userMessageHistories.computeIfAbsent(userId, k -> new java.util.ArrayList<>());
                        userMessageHistories.get(userId).add(UserMessage.from(message));
                        userMessageHistories.get(userId).add(AiMessage.from(fullResponse.toString()));
                        
                        ojTools.clearCurrentUserId();
                        sink.next("[DONE]");
                        sink.complete();
                    })
                    .onError(error -> {
                        logger.error("用户 {} 对话错误: {}", userId, error.getMessage(), error);
                        ojTools.clearCurrentUserId();
                        sink.next("[ERROR] " + error.getMessage());
                        sink.complete();
                    })
                    .start();
                    
            } catch (Exception e) {
                logger.error("处理用户 {} 消息时发生异常: {}", userId, e.getMessage(), e);
                ojTools.clearCurrentUserId();
                sink.next("[ERROR] " + e.getMessage());
                sink.complete();
            }
        });
    }

    @Override
    public void clearMemory(Long userId) {
        userMessageHistories.remove(userId);
    }

    @Override
    public List<String> getMessageHistoryList(Long userId) {
        List<ChatMessage> messages = userMessageHistories.get(userId);
        if (messages == null || messages.isEmpty()) {
            return Collections.emptyList();
        }

        return messages.stream()
                .map(chatMessage -> {
                    String role = chatMessage instanceof UserMessage ? "用户" : "AI";
                    String content = getMessageContent(chatMessage);
                    return String.format("[%s] %s", role, content);
                })
                .collect(Collectors.toList());
    }

    private String getMessageContent(ChatMessage chatMessage) {
        if (chatMessage instanceof UserMessage) {
            return ((UserMessage) chatMessage).singleText();
        } else if (chatMessage instanceof AiMessage) {
            return ((AiMessage) chatMessage).text();
        }
        return chatMessage.toString();
    }
}
