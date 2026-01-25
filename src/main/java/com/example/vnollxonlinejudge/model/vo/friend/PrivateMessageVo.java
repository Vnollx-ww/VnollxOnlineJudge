package com.example.vnollxonlinejudge.model.vo.friend;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrivateMessageVo {
    private Long id;
    private Long senderId;
    private String senderName;
    private String senderAvatar;
    private Long receiverId;
    private String content;
    private Boolean isRead;
    private LocalDateTime createTime;
    private Boolean isMine;
}
