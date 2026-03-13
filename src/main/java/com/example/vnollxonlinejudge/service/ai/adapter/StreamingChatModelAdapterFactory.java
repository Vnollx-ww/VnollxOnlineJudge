package com.example.vnollxonlinejudge.service.ai.adapter;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.entity.AiModel;
import com.example.vnollxonlinejudge.service.AiPlatformService;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 仅用于 platform=langchain4j：按 model.adapter_code 选择 openai/mistral/dashscope 适配器构建流式模型
 */
@Component
public class StreamingChatModelAdapterFactory {
    private final AiPlatformService aiPlatformService;
    private final Map<String, StreamingChatModelAdapter> adapterByCode;

    public StreamingChatModelAdapterFactory(AiPlatformService aiPlatformService,
                                           List<StreamingChatModelAdapter> adapters) {
        this.aiPlatformService = aiPlatformService;
        this.adapterByCode = adapters.stream()
                .collect(Collectors.toMap(a -> a.getAdapterCode().toLowerCase(), a -> a));
    }

    /** 仅当平台为 langchain4j 时调用，按 adapter_code 选适配器 */
    public StreamingChatLanguageModel build(AiModel model) {
        if (model.getPlatformId() == null) {
            throw new BusinessException("模型未关联平台");
        }
        var platform = aiPlatformService.getById(model.getPlatformId());
        if (!StreamingChatModelAdapter.PLATFORM_LANGCHAIN4J.equalsIgnoreCase(platform.getCode())) {
            throw new BusinessException("当前平台非 LangChain4j，不应走此工厂");
        }
        String code = model.getAdapterCode() != null ? model.getAdapterCode().trim().toLowerCase() : StreamingChatModelAdapter.CODE_DEFAULT;
        if (code.isEmpty()) {
            code = StreamingChatModelAdapter.CODE_DEFAULT;
        }
        StreamingChatModelAdapter adapter = adapterByCode.get(code);
        if (adapter == null) {
            adapter = adapterByCode.get(StreamingChatModelAdapter.CODE_DEFAULT);
        }
        if (adapter == null) {
            throw new BusinessException("未找到适配器: " + code);
        }
        return adapter.build(model);
    }
}
