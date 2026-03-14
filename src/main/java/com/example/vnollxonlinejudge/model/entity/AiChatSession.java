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
 * 用户 AI 会话表
 */
@TableName("ai_chat_session")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatSession {
    @TableId(type = IdType.INPUT)
    private String id;
    /** 用户ID */
    private Long userId;
    /** 会话标题 */
    private String title;
    /** 最近一次使用的模型ID */
    private Long lastModelId;
    /** 已产生的消息轮数 */
    private Integer messageCount;
    /** 最后一条消息时间 */
    private LocalDateTime lastMessageAt;
    /** 创建时间 */
    private LocalDateTime createTime;
    /** 更新时间 */
    private LocalDateTime updateTime;
}
