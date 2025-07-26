package com.example.vnollxonlinejudge.model.dto.response.user;

import com.example.vnollxonlinejudge.model.entity.User;
import lombok.Data;

@Data
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String identity;
    private int submitCount;
    private int passCount;
    private int penaltyTime;
    // constructors
    public UserResponse() {}

    public UserResponse(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.identity = user.getIdentity();
        this.submitCount=user.getSubmitCount();
        this.passCount=user.getPassCount();
        this.penaltyTime=user.getPenaltyTime();
    }

}