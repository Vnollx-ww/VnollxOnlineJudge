package com.example.vnollxonlinejudge.model.dto.ai;

import lombok.Data;

/**
 * AI 对话请求：可选 modelId，不传则使用第一个可用模型
 */
@Data
public class AiChatRequestDTO {
    /** 选中的模型 ID，不传则用第一个启用模型 */
    private Long modelId;
    private String message;
}
