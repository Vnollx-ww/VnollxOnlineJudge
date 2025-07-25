package com.example.vnollxonlinejudge.model.dto.request.admin;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class AdminSaveUserRequest {
    private Long id;

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 20, message = "用户名长度必须在2-20位之间")
    private String name;

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotBlank(message = "身份不能为空")
    private String identity;
}
