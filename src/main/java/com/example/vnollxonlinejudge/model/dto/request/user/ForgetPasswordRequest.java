package com.example.vnollxonlinejudge.model.dto.request.user;

import lombok.Data;

@Data
public class ForgetPasswordRequest {
    private String newPassword;
    private String email;
    private String verifyCode;
}
