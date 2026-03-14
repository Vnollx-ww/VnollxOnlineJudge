package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 管理后台保存/更新 AI 模型 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAiModelSaveDTO {
    private Long id;
    private Long platformId;
    private String adapterCode;
    private String name;
    private String modelId;
    private String logoUrl;
    private String endpoint;
    private String apiKey;
    private Integer maxTokens;
    private BigDecimal temperature;
    private Integer timeoutSeconds;
    private String extraConfig;
    private Integer sortOrder;
    private Integer status;
    /** 代理类型：domestic-国内代理，overseas-国外代理 */
    private String proxyType;
}
