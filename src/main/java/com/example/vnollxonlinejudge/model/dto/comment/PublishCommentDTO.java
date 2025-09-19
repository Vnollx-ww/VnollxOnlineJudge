package com.example.vnollxonlinejudge.model.dto.comment;

import lombok.Data;

@Data
public class PublishCommentDTO {
    private Long problemId;
    private Long parentId;
    private Long receiveUserId;
    private String username;
    private String content;
    private String createTime;
}
