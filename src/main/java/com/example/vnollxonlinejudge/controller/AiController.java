package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.alibaba.fastjson2.JSON;
import com.example.vnollxonlinejudge.model.dto.ai.AiChatRequestDTO;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryItemVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiModelVo;
import com.example.vnollxonlinejudge.service.AiModelService;
import com.example.vnollxonlinejudge.service.AiService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {
    private static final Logger logger = LoggerFactory.getLogger(AiController.class);
    private final AiService aiService;
    private final AiModelService aiModelService;

    public AiController(AiService aiService, AiModelService aiModelService) {
        this.aiService = aiService;
        this.aiModelService = aiModelService;
    }

    /** 获取可选用的 AI 模型列表（仅启用） */
    @GetMapping("/models")
    @RequirePermission(PermissionCode.AI_CHAT)
    public Result<List<AiModelVo>> listModels() {
        return Result.Success(aiModelService.listEnabled());
    }

    /** SSE 流式对话：body 可为 JSON { "modelId": 1, "message": "..." } 或纯文本（整段为 message） */
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @RequirePermission(PermissionCode.AI_CHAT)
    public Flux<String> streamChat(@RequestBody String body) {
        Long userId = UserContextHolder.getCurrentUserId();
        String message;
        Long modelId = null;
        if (body != null && body.trim().startsWith("{")) {
            try {
                AiChatRequestDTO request = JSON.parseObject(body, AiChatRequestDTO.class);
                if (request != null) {
                    message = request.getMessage();
                    modelId = request.getModelId();
                } else {
                    message = body;
                }
            } catch (Exception e) {
                message = body;
            }
        } else {
            message = body != null ? body : "";
        }
        if (message == null) message = "";
        Flux<String> flux = (modelId != null)
                ? aiService.chat(userId, modelId, message)
                : aiService.chat(userId, message);
        return flux
                .doOnError(error -> logger.error("AI服务错误: {}", error.getMessage()))
                .onErrorReturn("【系统】AI服务暂时不可用");
    }

    @PostMapping("/clear")
    @RequirePermission(PermissionCode.AI_CHAT)
    public Result<Void> clearMemory() {
        Long userId = UserContextHolder.getCurrentUserId();
        aiService.clearMemory(userId);
        return Result.Success();
    }

    @GetMapping("/history")
    @RequirePermission(PermissionCode.AI_CHAT)
    public Result<List<AiChatHistoryItemVo>> getMessageHistoryList() {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(aiService.getMessageHistoryList(userId));
    }
}
