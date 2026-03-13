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
 * AI 平台表：SDK/适配器类型（openai、mistral、dashscope 等），模型关联后通过工厂找到对应适配器调用
 */
@TableName("ai_platform")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiPlatform {
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 平台编码，对应适配器标识 */
    private String code;
    /** 平台显示名称 */
    private String name;
    private String description;
    private Integer sortOrder;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
