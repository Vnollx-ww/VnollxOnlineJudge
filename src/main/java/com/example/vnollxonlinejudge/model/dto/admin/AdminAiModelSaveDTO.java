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
    private String logoUrl;
    private String apiKey;
    private String extraConfig;
    private Integer sortOrder;
    private Integer status;
    /** 代理类型：domestic-国内代理，overseas-国外代理 */
    private String proxyType;
}
