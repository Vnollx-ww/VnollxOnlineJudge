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
    private String logoUrl;
    private String extraConfig;
    private Integer sortOrder;
    private Integer status;
    /** 代理类型：domestic-国内代理，overseas-国外代理 */
    private String proxyType;
}
