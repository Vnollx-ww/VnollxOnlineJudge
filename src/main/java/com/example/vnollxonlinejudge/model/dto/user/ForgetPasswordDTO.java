package com.example.vnollxonlinejudge.model.dto.user;

import lombok.Data;

@Data
public class ForgetPasswordDTO {
    private String newPassword;
    private String email;
    private String verifyCode;
}
