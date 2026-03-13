package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.AiModelMapper;
import com.example.vnollxonlinejudge.model.dto.admin.AdminAiModelSaveDTO;
import com.example.vnollxonlinejudge.model.entity.AiModel;
import com.example.vnollxonlinejudge.model.entity.AiPlatform;
import com.example.vnollxonlinejudge.model.vo.ai.AiModelVo;
import com.example.vnollxonlinejudge.service.AiModelService;
import com.example.vnollxonlinejudge.service.AiPlatformService;
import com.example.vnollxonlinejudge.service.ai.adapter.StreamingChatModelAdapterFactory;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AiModelServiceImpl implements AiModelService {
    private static final Logger logger = LoggerFactory.getLogger(AiModelServiceImpl.class);
    private final AiModelMapper aiModelMapper;
    private final AiPlatformService aiPlatformService;
    private final StreamingChatModelAdapterFactory adapterFactory;

    public AiModelServiceImpl(AiModelMapper aiModelMapper, AiPlatformService aiPlatformService,
                              StreamingChatModelAdapterFactory adapterFactory) {
        this.aiModelMapper = aiModelMapper;
        this.aiPlatformService = aiPlatformService;
        this.adapterFactory = adapterFactory;
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
        if (list.isEmpty()) {
            return List.of();
        }
        Map<Long, AiPlatform> platformMap = aiPlatformService.getByIds(
                list.stream().map(AiModel::getPlatformId).distinct().toList());
        return list.stream()
                .map(m -> toVo(m, platformMap.get(m.getPlatformId())))
                .collect(Collectors.toList());
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
        if (dto.getPlatformId() == null) {
            throw new BusinessException("请选择 AI 平台");
        }
        var platform = aiPlatformService.getById(dto.getPlatformId());
        if ("langchain4j".equalsIgnoreCase(platform.getCode()) && (dto.getAdapterCode() == null || dto.getAdapterCode().trim().isEmpty())) {
            throw new BusinessException("LangChain4j 平台请选择适配器（OpenAI/Mistral/阿里云百炼）");
        }
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
        if (dto.getPlatformId() != null) {
            aiPlatformService.getById(dto.getPlatformId()); // 校验平台存在
        }
        AiModel entity = toEntity(dto);
        entity.setId(dto.getId());
        if (dto.getPlatformId() == null) {
            entity.setPlatformId(existing.getPlatformId());
        }
        if (dto.getAdapterCode() == null && existing.getAdapterCode() != null) {
            entity.setAdapterCode(existing.getAdapterCode());
        }
        // 更新时若未传 apiKey 则保留原值
        if (dto.getApiKey() == null || dto.getApiKey().trim().isEmpty()) {
            entity.setApiKey(existing.getApiKey());
        }
        aiModelMapper.updateById(entity);
    }

    @Override
    public void delete(Long id) {
        if (aiModelMapper.selectById(id) == null) {
            throw new BusinessException("AI 模型不存在");
        }
        aiModelMapper.deleteById(id);
    }

    @Override
    public StreamingChatLanguageModel buildStreamingModel(AiModel model) {
        if (model.getApiKey() == null || model.getApiKey().trim().isEmpty()) {
            throw new BusinessException("该模型未配置 API Key");
        }
        return adapterFactory.build(model);
    }

    private AiModelVo toVo(AiModel e, AiPlatform platform) {
        return AiModelVo.builder()
                .id(e.getId())
                .platformId(e.getPlatformId())
                .platformCode(platform != null ? platform.getCode() : null)
                .platformName(platform != null ? platform.getName() : null)
                .adapterCode(e.getAdapterCode())
                .name(e.getName())
                .modelId(e.getModelId())
                .logoUrl(e.getLogoUrl())
                .sortOrder(e.getSortOrder())
                .build();
    }

    private AiModel toEntity(AdminAiModelSaveDTO dto) {
        return AiModel.builder()
                .id(dto.getId())
                .platformId(dto.getPlatformId())
                .adapterCode(dto.getAdapterCode())
                .name(dto.getName())
                .modelId(dto.getModelId())
                .logoUrl(dto.getLogoUrl())
                .endpoint(dto.getEndpoint())
                .apiKey(dto.getApiKey())
                .maxTokens(dto.getMaxTokens() != null ? dto.getMaxTokens() : 4096)
                .temperature(dto.getTemperature() != null ? dto.getTemperature() : new java.math.BigDecimal("0.70"))
                .timeoutSeconds(dto.getTimeoutSeconds() != null ? dto.getTimeoutSeconds() : 60)
                .extraConfig(dto.getExtraConfig())
                .sortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0)
                .status(dto.getStatus() != null ? dto.getStatus() : 1)
                .build();
    }
}
