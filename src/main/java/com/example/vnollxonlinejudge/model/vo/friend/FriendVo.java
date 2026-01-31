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
public class FriendVo {
    private Long id;
    private Long userId;
    private String userName;
    private String userAvatar;
    private String userSignature;
    private Integer status;
    private LocalDateTime createTime;
    private Integer unreadCount;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
    private Boolean isOnline;
}
