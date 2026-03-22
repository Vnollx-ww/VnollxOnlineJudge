package com.example.vnollxonlinejudge.model.vo.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AI 模型展示 VO（不含 apiKey）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiModelVo {
    private Long id;
    private String name;
    private String logoUrl;
    private Integer sortOrder;
}
