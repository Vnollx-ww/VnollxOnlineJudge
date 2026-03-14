package com.example.vnollxonlinejudge.model.vo.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 管理后台模型详情（不含 apiKey）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAiModelDetailVo {
    private Long id;
    private Long platformId;
    private String adapterCode;
    private String name;
    private String modelId;
    private String logoUrl;
    private String endpoint;
    private Integer maxTokens;
    private BigDecimal temperature;
    private Integer timeoutSeconds;
    private String extraConfig;
    private Integer sortOrder;
    private Integer status;
    /** 代理类型：domestic-国内代理，overseas-国外代理 */
    private String proxyType;
}
