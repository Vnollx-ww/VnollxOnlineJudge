package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@TableName("notification")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String title;
    private String description;
    private String createTime;
    private Long uid;
    private Boolean isRead;
    private Long commentId;
}
