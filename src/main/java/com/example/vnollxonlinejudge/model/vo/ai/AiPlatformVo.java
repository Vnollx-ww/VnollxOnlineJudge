package com.example.vnollxonlinejudge.model.vo.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AI 平台列表项（供下拉选择等）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiPlatformVo {
    private Long id;
    private String code;
    private String name;
}
