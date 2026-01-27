package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.example.vnollxonlinejudge.config.DynamicAiConfig;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.service.serviceImpl.AiServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI配置管理接口（仅管理员可用）
 */
@RestController
@RequestMapping("/admin/ai-config")
public class AdminAiConfigController {
    private static final Logger logger = LoggerFactory.getLogger(AdminAiConfigController.class);

    private final DynamicAiConfig dynamicAiConfig;
    private final AiServiceImpl aiService;

    public AdminAiConfigController(DynamicAiConfig dynamicAiConfig, AiServiceImpl aiService) {
        this.dynamicAiConfig = dynamicAiConfig;
        this.aiService = aiService;
    }

    /**
     * 获取当前AI配置信息
     */
    @GetMapping("/info")
    @RequirePermission(PermissionCode.AI_CONFIG_VIEW)
    public Result<DynamicAiConfig.AiConfigInfo> getConfigInfo() {
        return Result.Success(dynamicAiConfig.getConfigInfo());
    }

    /**
     * 更新API Key
     */
    @PostMapping("/api-key")
    @RequirePermission(PermissionCode.AI_CONFIG_UPDATE)
    public Result<String> updateApiKey(@RequestBody Map<String, String> request) {
        String apiKey = request.get("apiKey");
        if (apiKey == null || apiKey.trim().isEmpty()) {
            return Result.LogicError("API Key 不能为空");
        }

        try {
            dynamicAiConfig.updateApiKey(apiKey);
            aiService.rebuildAssistant();
            logger.info("管理员更新了 API Key");
            return Result.Success("API Key 更新成功");
        } catch (Exception e) {
            logger.error("更新 API Key 失败: {}", e.getMessage(), e);
            return Result.SystemError("更新失败: " + e.getMessage());
        }
    }

    /**
     * 更新模型配置
     */
    @PostMapping("/model")
    @RequirePermission(PermissionCode.AI_CONFIG_UPDATE)
    public Result<String> updateModelConfig(@RequestBody Map<String, Object> request) {
        try {
            String model = (String) request.get("model");
            Double temperature = request.get("temperature") != null 
                    ? ((Number) request.get("temperature")).doubleValue() 
                    : null;
            String baseUrl = (String) request.get("baseUrl");

            dynamicAiConfig.updateModelConfig(model, temperature, baseUrl);
            aiService.rebuildAssistant();
            logger.info("管理员更新了模型配置");
            return Result.Success("模型配置更新成功");
        } catch (Exception e) {
            logger.error("更新模型配置失败: {}", e.getMessage(), e);
            return Result.SystemError("更新失败: " + e.getMessage());
        }
    }

    /**
     * 测试AI连接
     */
    @PostMapping("/test")
    @RequirePermission(PermissionCode.AI_CONFIG_VIEW)
    public Result<String> testConnection() {
        if (!dynamicAiConfig.isConfigured()) {
            return Result.LogicError("AI未配置，请先设置 API Key");
        }
        try {
            // 简单测试：获取模型实例
            dynamicAiConfig.getStreamingModel();
            return Result.Success("连接测试成功");
        } catch (Exception e) {
            return Result.SystemError("连接测试失败: " + e.getMessage());
        }
    }
}
