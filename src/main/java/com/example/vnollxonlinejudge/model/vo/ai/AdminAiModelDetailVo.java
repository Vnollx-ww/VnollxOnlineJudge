package com.example.vnollxonlinejudge.model.vo.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 管理后台模型详情（不含 apiKey）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAiModelDetailVo {
    private Long id;
    private String name;
    /** 适配器类型：openai_compatible / gemini 等 */
    private String provider;
    /** 真实厂商模型名（透传给上游 SDK） */
    private String modelCode;
    /** 上游 API base URL */
    private String baseUrl;
    private String logoUrl;
    private String extraConfig;
    private Integer sortOrder;
    private Integer status;
    /** 代理类型：domestic-国内代理，overseas-国外代理 */
    private String proxyType;
}
