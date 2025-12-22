package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.service.AiService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;


@RestController
@RequestMapping("/ai")
public class AiController {
    private static final Logger logger = LoggerFactory.getLogger(AiController.class);
    private final AiService aiService;

    @Autowired
    public AiController(AiService aiService){
        this.aiService=aiService;
    }

    // 流式响应接口 (GET - 适用于短消息)
    @GetMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamChat(@RequestParam String message) {
        Long userId = UserContextHolder.getCurrentUserId();

        return aiService.chat(userId, message)
                .doOnNext(token -> logger.trace("发送token - 用户: {}, token: {}", userId, token))
                .doOnError(error -> logger.error("AI服务错误 - 用户: {}, 错误: {}", userId, error.getMessage(), error))
                .onErrorReturn("【系统】AI服务暂时不可用，请稍后重试");
    }

    // 流式响应接口 (POST - 适用于大消息体，如代码分析)
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamChatPost(@RequestBody String message) {
        Long userId = UserContextHolder.getCurrentUserId();

        return aiService.chat(userId, message)
                .doOnNext(token -> logger.trace("发送token - 用户: {}, token: {}", userId, token))
                .doOnError(error -> logger.error("AI服务错误 - 用户: {}, 错误: {}", userId, error.getMessage(), error))
                .onErrorReturn("【系统】AI服务暂时不可用，请稍后重试");
    }

    @PostMapping("/clear")
    public Result<Void> clearMemory() {
        Long userId= UserContextHolder.getCurrentUserId();
        aiService.clearMemory(userId);
        return Result.Success();
    }
    @GetMapping("/history")
    public Result<List<String>> getMessageHistoryList(){
        Long userId= UserContextHolder.getCurrentUserId();
        return Result.Success(aiService.getMessageHistoryList(userId));
    }
}
