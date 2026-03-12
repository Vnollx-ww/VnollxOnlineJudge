package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
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
@RequestMapping("/api/v1/ai")
public class AiController {
    private static final Logger logger = LoggerFactory.getLogger(AiController.class);
    private final AiService aiService;

    @Autowired
    public AiController(AiService aiService){
        this.aiService=aiService;
    }

    // SSE 流式接口 - 供其他页面使用（UserProfile, ProblemDetail）
    // AI 助手主界面使用 WebSocket (/ws/ai)
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @RequirePermission(PermissionCode.AI_CHAT)
    public Flux<String> streamChat(@RequestBody String message) {
        Long userId = UserContextHolder.getCurrentUserId();
        return aiService.chat(userId, message)
                .doOnError(error -> logger.error("AI服务错误: {}", error.getMessage()))
                .onErrorReturn("【系统】AI服务暂时不可用");
    }

    @PostMapping("/clear")
    @RequirePermission(PermissionCode.AI_CHAT)
    public Result<Void> clearMemory() {
        Long userId= UserContextHolder.getCurrentUserId();
        aiService.clearMemory(userId);
        return Result.Success();
    }

    @GetMapping("/history")
    @RequirePermission(PermissionCode.AI_CHAT)
    public Result<List<String>> getMessageHistoryList(){
        Long userId= UserContextHolder.getCurrentUserId();
        return Result.Success(aiService.getMessageHistoryList(userId));
    }
}
