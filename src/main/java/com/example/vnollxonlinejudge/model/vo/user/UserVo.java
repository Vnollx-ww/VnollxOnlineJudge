package com.example.vnollxonlinejudge.model.vo.user;

import com.example.vnollxonlinejudge.model.entity.User;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Data
public class UserVo {
    private Long id;
    private String name;
    private String email;
    private String identity;
    private Integer submitCount;
    private Integer passCount;
    private Integer penaltyTime;
    private String avatar;
    private String signature;
    private LocalDateTime lastLoginTime;
    // constructors
    public UserVo() {}

    public UserVo(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.identity = user.getIdentity();
        this.submitCount=user.getSubmitCount();
        this.passCount=user.getPassCount();
        this.penaltyTime=user.getPenaltyTime();
        this.avatar=user.getAvatar();
        this.lastLoginTime=user.getLastLoginTime();
        this.signature=user.getSignature();
    }

}