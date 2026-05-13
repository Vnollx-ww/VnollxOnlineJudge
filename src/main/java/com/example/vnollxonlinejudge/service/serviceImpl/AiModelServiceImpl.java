package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.AiModelMapper;
import com.example.vnollxonlinejudge.model.dto.admin.AdminAiModelSaveDTO;
import com.example.vnollxonlinejudge.model.entity.AiModel;
import com.example.vnollxonlinejudge.model.vo.ai.AiModelVo;
import com.example.vnollxonlinejudge.service.AiModelService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AiModelServiceImpl implements AiModelService {
    private static final Logger logger = LoggerFactory.getLogger(AiModelServiceImpl.class);
    private final AiModelMapper aiModelMapper;

    public AiModelServiceImpl(AiModelMapper aiModelMapper) {
        this.aiModelMapper = aiModelMapper;
    }

    @Override
    public List<AiModelVo> listEnabled() {
        LambdaQueryWrapper<AiModel> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiModel::getStatus, 1).orderByAsc(AiModel::getSortOrder);
        List<AiModel> list = aiModelMapper.selectList(wrapper);
        return toVoList(list);
    }

    @Override
    public List<AiModelVo> listAll() {
        LambdaQueryWrapper<AiModel> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByAsc(AiModel::getSortOrder);
        List<AiModel> list = aiModelMapper.selectList(wrapper);
        return toVoList(list);
    }

    private List<AiModelVo> toVoList(List<AiModel> list) {
        return list.stream().map(this::toVo).collect(Collectors.toList());
    }

    @Override
    public AiModel getById(Long id) {
        AiModel model = aiModelMapper.selectById(id);
        if (model == null) {
            throw new BusinessException("AI 模型不存在");
        }
        return model;
    }

    @Override
    public Long create(AdminAiModelSaveDTO dto) {
        validateSaveDto(dto);
        ensureProviderModelCodeUnique(dto.getProvider(), dto.getModelCode(), null);
        AiModel entity = toEntity(dto);
        entity.setId(null);
        aiModelMapper.insert(entity);
        return entity.getId();
    }

    @Override
    public void update(AdminAiModelSaveDTO dto) {
        if (dto.getId() == null) {
            throw new BusinessException("更新时 ID 不能为空");
        }
        AiModel existing = aiModelMapper.selectById(dto.getId());
        if (existing == null) {
            throw new BusinessException("AI 模型不存在");
        }
        validateSaveDto(dto);
        ensureProviderModelCodeUnique(dto.getProvider(), dto.getModelCode(), dto.getId());
        AiModel entity = toEntity(dto);
        entity.setId(dto.getId());
        if (dto.getApiKey() == null || dto.getApiKey().trim().isEmpty()) {
            entity.setApiKey(existing.getApiKey());
        }
        if (dto.getProxyType() == null || dto.getProxyType().isBlank()) {
            entity.setProxyType(existing.getProxyType() != null ? existing.getProxyType() : "overseas");
        }
        aiModelMapper.updateById(entity);
    }

    private void validateSaveDto(AdminAiModelSaveDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BusinessException("模型显示名称不能为空");
        }
        if (dto.getProvider() == null || dto.getProvider().trim().isEmpty()) {
            throw new BusinessException("provider 不能为空");
        }
        if (dto.getModelCode() == null || dto.getModelCode().trim().isEmpty()) {
            throw new BusinessException("modelCode 不能为空");
        }
        if ("openai_compatible".equalsIgnoreCase(dto.getProvider().trim())
                && (dto.getBaseUrl() == null || dto.getBaseUrl().trim().isEmpty())) {
            throw new BusinessException("openai_compatible 适配器必须填写 baseUrl");
        }
    }

    private void ensureProviderModelCodeUnique(String provider, String modelCode, Long excludeId) {
        LambdaQueryWrapper<AiModel> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiModel::getProvider, provider.trim())
                .eq(AiModel::getModelCode, modelCode.trim());
        if (excludeId != null) {
            wrapper.ne(AiModel::getId, excludeId);
        }
        Long count = aiModelMapper.selectCount(wrapper);
        if (count != null && count > 0) {
            throw new BusinessException("已存在相同 (provider, modelCode) 的模型记录");
        }
    }

    @Override
    public void delete(Long id) {
        if (aiModelMapper.selectById(id) == null) {
            throw new BusinessException("AI 模型不存在");
        }
        aiModelMapper.deleteById(id);
    }

    private AiModelVo toVo(AiModel e) {
        return AiModelVo.builder()
                .id(e.getId())
                .name(e.getName())
                .logoUrl(e.getLogoUrl())
                .sortOrder(e.getSortOrder())
                .build();
    }

    private AiModel toEntity(AdminAiModelSaveDTO dto) {
        return AiModel.builder()
                .id(dto.getId())
                .name(dto.getName() != null ? dto.getName().trim() : null)
                .provider(dto.getProvider() != null ? dto.getProvider().trim() : null)
                .modelCode(dto.getModelCode() != null ? dto.getModelCode().trim() : null)
                .baseUrl(dto.getBaseUrl() != null ? dto.getBaseUrl().trim() : null)
                .logoUrl(dto.getLogoUrl())
                .apiKey(dto.getApiKey())
                .extraConfig(dto.getExtraConfig())
                .sortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0)
                .status(dto.getStatus() != null ? dto.getStatus() : 1)
                .proxyType(dto.getProxyType() != null ? dto.getProxyType() : "overseas")
                .build();
    }
}
