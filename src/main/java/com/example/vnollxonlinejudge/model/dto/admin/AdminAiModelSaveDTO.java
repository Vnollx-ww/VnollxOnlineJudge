package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 管理后台保存/更新 AI 模型 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAiModelSaveDTO {
    private Long id;
    private String name;
    /** 适配器类型：openai_compatible / gemini 等 */
    private String provider;
    /** 真实厂商模型名（透传给上游 SDK，如 mistral-large-latest、glm-4.7） */
    private String modelCode;
    /** 上游 API base URL（openai_compatible 必填） */
    private String baseUrl;
    private String logoUrl;
    private String apiKey;
    private String extraConfig;
    private Integer sortOrder;
    private Integer status;
    /** 代理类型：domestic-国内代理，overseas-国外代理 */
    private String proxyType;
}
