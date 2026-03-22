package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    /** 模型显示名称 */
    private String name;
    /** 模型 Logo 图片地址 */
    private String logoUrl;
    /** API 密钥 */
    private String apiKey;
    /** 扩展配置(JSON) */
    private String extraConfig;
    /** 排序序号 */
    private Integer sortOrder;
    /** 状态：1-启用，0-禁用 */
    private Integer status;
    /** 代理类型：domestic-国内代理，overseas-国外代理 */
    private String proxyType;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
