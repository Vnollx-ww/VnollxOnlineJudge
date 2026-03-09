package com.example.vnollxonlinejudge.model.vo.statistics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 语言分布统计
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LanguageStatVO {
    private String language;
    private Long count;
}
