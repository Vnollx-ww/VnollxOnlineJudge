package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.controller.AiController;
import com.example.vnollxonlinejudge.service.AiService;
import com.sun.mail.iap.ResponseHandler;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.StreamingResponseHandler;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import dev.langchain4j.model.output.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AiServiceImpl implements AiService {
    private static final Logger logger = LoggerFactory.getLogger(AiServiceImpl.class);
    private final OpenAiStreamingChatModel streamingModel;
    private final Map<Long, ChatMemory> userChatMemories;

    public AiServiceImpl(OpenAiStreamingChatModel streamingModel) {
        this.streamingModel = streamingModel;
        this.userChatMemories = new ConcurrentHashMap<>();
    }
    @Override
    public Flux<String> chat(Long userId, String message) {
        return Flux.create(sink -> {
            ChatMemory userMemory = userChatMemories.computeIfAbsent(
                    userId, k -> MessageWindowChatMemory.withMaxMessages(10)
            );

            userMemory.add(UserMessage.from(message));
            List<ChatMessage> messages = userMemory.messages();
            StringBuilder fullResponse = new StringBuilder();

            streamingModel.generate(messages, new StreamingResponseHandler<>() {
                @Override
                public void onNext(String token) {
                    sink.next(token);
                    fullResponse.append(token);
                }

                @Override
                public void onComplete(Response<AiMessage> response) {
                    userMemory.add(AiMessage.from(fullResponse.toString()));
                    sink.next("[DONE]"); // 发送结束信号
                    sink.complete();
                    logger.info("流式对话完成 - 用户: {}", userId);
                }

                @Override
                public void onError(Throwable error) {
                    logger.error("流式对话错误 - 用户: {}", userId, error);
                    userChatMemories.remove(userId);
                    sink.next("[ERROR] " + error.getMessage()); // 发送错误信号
                    sink.complete();
                }
            });
        });
    }

    @Override
    public void clearMemory(Long userId) {
        userChatMemories.remove(userId);
    }

}
