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
 * 用户 AI 对话记录表
 */
@TableName("ai_chat_record")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 用户ID */
    private Long userId;
    /** 使用的AI模型ID */
    private Long modelId;
    /** 会话ID(多轮对话分组) */
    private String sessionId;
    /** 用户提问内容 */
    private String userMessage;
    /** 模型回答内容 */
    private String modelReply;
    /** 思考过程内容（如智谱 reasoningContent） */
    private String thinkingContent;
    /** 请求消耗 token 数 */
    private Integer promptTokens;
    /** 回答消耗 token 数 */
    private Integer completionTokens;
    /** 总 token 数 */
    private Integer totalTokens;
    /** 响应耗时(毫秒) */
    private Integer latencyMs;
    /** 状态：success/fail/timeout/error */
    private String status;
    /** 失败时的错误信息 */
    private String errorMessage;
    /** 提问时间 */
    private LocalDateTime createTime;
    /** 回答完成时间 */
    private LocalDateTime replyTime;
}
