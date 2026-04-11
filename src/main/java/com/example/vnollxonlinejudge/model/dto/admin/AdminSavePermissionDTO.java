package com.example.vnollxonlinejudge.model.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminSavePermissionDTO {
    @NotBlank(message = "权限码不能为空")
    @Size(max = 100, message = "权限码长度不能超过100")
    private String code;

    @NotBlank(message = "权限名称不能为空")
    @Size(max = 100, message = "权限名称长度不能超过100")
    private String name;

    @NotBlank(message = "模块名称不能为空")
    @Size(max = 100, message = "模块名称长度不能超过100")
    private String module;

    @Size(max = 255, message = "权限描述长度不能超过255")
    private String description;
}
