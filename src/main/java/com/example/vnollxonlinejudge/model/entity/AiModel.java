package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * AI 模型配置表
 */
@TableName("ai_model")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiModel {
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 所属平台 ID，关联 ai_platform */
    private Long platformId;
    /** 平台=langchain4j 时必填: openai / mistral / dashscope */
    private String adapterCode;
    /** 模型显示名称 */
    private String name;
    /** 模型标识(如 gpt-4、qwen-plus) */
    private String modelId;
    /** 模型 Logo 图片地址 */
    private String logoUrl;
    /** API 请求地址（部分平台可覆盖默认） */
    private String endpoint;
    /** API 密钥 */
    private String apiKey;
    /** 单次最大 token 数 */
    private Integer maxTokens;
    /** 温度参数 0-2 */
    private BigDecimal temperature;
    /** 请求超时秒数 */
    private Integer timeoutSeconds;
    /** 扩展配置(JSON) */
    private String extraConfig;
    /** 排序序号 */
    private Integer sortOrder;
    /** 状态：1-启用，0-禁用 */
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
