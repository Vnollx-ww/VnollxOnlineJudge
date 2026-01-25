package com.example.vnollxonlinejudge.model.vo.friend;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchVo {
    private Long id;
    private String name;
    private String avatar;
    private String signature;
    // 好友关系状态: null-非好友, 0-待确认, 1-已是好友, 2-被拒绝
    private Integer friendStatus;
    // 是否是我发起的请求
    private Boolean isRequester;
}
