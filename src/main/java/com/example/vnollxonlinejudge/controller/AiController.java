package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.alibaba.fastjson2.JSON;
import com.example.vnollxonlinejudge.model.dto.ai.AiChatRequestDTO;
import com.example.vnollxonlinejudge.model.dto.ai.AiSessionCreateRequestDTO;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryItemVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatHistoryPageVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiModelVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiChatSessionVo;
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
        String sessionId = null;
        if (body != null && body.trim().startsWith("{")) {
            try {
                AiChatRequestDTO request = JSON.parseObject(body, AiChatRequestDTO.class);
                if (request != null) {
                    message = request.getMessage();
                    modelId = request.getModelId();
                    sessionId = request.getSessionId();
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
                ? aiService.chat(userId, modelId, sessionId, message)
                : aiService.chat(userId, sessionId, message);
        return flux
                .doOnError(error -> logger.error("AI服务错误: {}", error.getMessage()))
                .onErrorReturn("【系统】AI服务暂时不可用");
    }

    @GetMapping("/sessions")
    @RequirePermission(PermissionCode.AI_CHAT)
    public Result<List<AiChatSessionVo>> listSessions() {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(aiService.listSessions(userId));
    }

    @PostMapping("/sessions")
    @RequirePermission(PermissionCode.AI_CHAT)
    public Result<AiChatSessionVo> createSession(@RequestBody(required = false) AiSessionCreateRequestDTO request) {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(aiService.createSession(userId, request != null ? request.getTitle() : null));
    }

    @DeleteMapping("/sessions/{sessionId}")
    @RequirePermission(PermissionCode.AI_CHAT)
    public Result<Void> deleteSession(@PathVariable String sessionId) {
        Long userId = UserContextHolder.getCurrentUserId();
        aiService.deleteSession(userId, sessionId);
        return Result.Success();
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
    public Result<List<AiChatHistoryItemVo>> getMessageHistoryList(
            @RequestParam(required = false) String sessionId) {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(aiService.getMessageHistoryList(userId, sessionId));
    }

    /**
     * 分页查询对话历史（懒加载）
     * @param beforeId 游标：查询ID小于此值的记录，null或不传表示首次加载
     * @param limit 每页条数，首次加载建议10，后续滚动加载建议5
     */
    @GetMapping("/history/page")
    @RequirePermission(PermissionCode.AI_CHAT)
    public Result<AiChatHistoryPageVo> getMessageHistoryPage(
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(defaultValue = "10") int limit) {
        Long userId = UserContextHolder.getCurrentUserId();
        // 限制每页最大条数
        int safeLimit = Math.max(1, Math.min(limit, 20));
        return Result.Success(aiService.getMessageHistoryPage(userId, sessionId, beforeId, safeLimit));
    }
}
