package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.example.vnollxonlinejudge.model.dto.admin.AdminAiModelSaveDTO;
import com.example.vnollxonlinejudge.model.entity.AiModel;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.ai.AdminAiModelDetailVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiModelVo;
import com.example.vnollxonlinejudge.model.vo.ai.AiPlatformVo;
import com.example.vnollxonlinejudge.service.AiModelService;
import com.example.vnollxonlinejudge.service.AiPlatformService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 管理后台：AI 模型管理（CRUD）
 */
@RestController
@RequestMapping("/api/v1/admin/ai-model")
public class AdminAiModelController {
    private static final Logger logger = LoggerFactory.getLogger(AdminAiModelController.class);
    private final AiModelService aiModelService;
    private final AiPlatformService aiPlatformService;

    public AdminAiModelController(AiModelService aiModelService, AiPlatformService aiPlatformService) {
        this.aiModelService = aiModelService;
        this.aiPlatformService = aiPlatformService;
    }

    @GetMapping("/platforms")
    @RequirePermission(PermissionCode.AI_CONFIG_VIEW)
    public Result<List<AiPlatformVo>> listPlatforms() {
        return Result.Success(aiPlatformService.listEnabled());
    }

    @GetMapping("/list")
    @RequirePermission(PermissionCode.AI_CONFIG_VIEW)
    public Result<List<AiModelVo>> list() {
        return Result.Success(aiModelService.listAll());
    }

    @GetMapping("/{id}")
    @RequirePermission(PermissionCode.AI_CONFIG_VIEW)
    public Result<AdminAiModelDetailVo> getById(@PathVariable Long id) {
        AiModel entity = aiModelService.getById(id);
        AdminAiModelDetailVo vo = AdminAiModelDetailVo.builder()
                .id(entity.getId())
                .name(entity.getName())
                .logoUrl(entity.getLogoUrl())
                .extraConfig(entity.getExtraConfig())
                .sortOrder(entity.getSortOrder())
                .status(entity.getStatus())
                .proxyType(entity.getProxyType())
                .build();
        return Result.Success(vo);
    }

    @PostMapping("/save")
    @RequirePermission(PermissionCode.AI_CONFIG_UPDATE)
    public Result<Long> save(@RequestBody @Valid AdminAiModelSaveDTO dto) {
        if (dto.getId() != null && dto.getId() > 0) {
            aiModelService.update(dto);
            return Result.Success(dto.getId(), "更新成功");
        }
        Long id = aiModelService.create(dto);
        return Result.Success(id, "创建成功");
    }

    @DeleteMapping("/{id}")
    @RequirePermission(PermissionCode.AI_CONFIG_UPDATE)
    public Result<Void> delete(@PathVariable Long id) {
        aiModelService.delete(id);
        return Result.Success();
    }
}
