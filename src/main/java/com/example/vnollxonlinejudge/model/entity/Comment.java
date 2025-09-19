package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.Table;
import lombok.Data;

@Table(name = "comment")
@Data
public class Comment {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String content;
    private String username;
    private String createTime;
    private Long problemId;
    private Long parentId;
    private Long userId;
}
