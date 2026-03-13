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
 * 用户 AI 对话摘要表
 * 当对话轮数超过阈值时，将较旧的对话压缩为摘要，减少后续调用的 token 消耗
 */
@TableName("ai_chat_summary")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatSummary {
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 用户ID */
    private Long userId;
    /** 摘要内容 */
    private String summaryContent;
    /** 本次摘要覆盖到的最后一条 ai_chat_record 的 ID */
    private Long coveredUntilRecordId;
    /** 被摘要的对话轮数 */
    private Integer coveredRounds;
    /** 创建时间 */
    private LocalDateTime createTime;
    /** 更新时间 */
    private LocalDateTime updateTime;
}
