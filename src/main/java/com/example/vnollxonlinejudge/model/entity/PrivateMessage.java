package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@TableName("private_message")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrivateMessage {
    @TableId(type = IdType.AUTO)
    private Long id;
    
    // 发送者ID
    private Long senderId;
    
    // 接收者ID
    private Long receiverId;
    
    // 消息内容 (支持Emoji，使用utf8mb4)
    private String content;
    
    // 是否已读
    private Boolean isRead;
    
    // 发送者是否删除
    private Boolean deletedBySender;
    
    // 接收者是否删除
    private Boolean deletedByReceiver;
    
    // 发送时间
    private LocalDateTime createTime;
}
