package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@TableName("friend")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Friend {
    @TableId(type = IdType.AUTO)
    private Long id;
    
    // 用户ID
    private Long userId;
    
    // 好友ID
    private Long friendId;
    
    // 状态: 0-待确认, 1-已同意, 2-已拒绝
    private Integer status;
    
    // 创建时间
    private LocalDateTime createTime;
    
    // 更新时间
    private LocalDateTime updateTime;
}
