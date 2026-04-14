package com.example.vnollxonlinejudge.model.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminSavePermissionDTO {
    @NotBlank(message = "权限码不能为空")
    @Size(min = 2, max = 100, message = "权限码长度必须在2-100位之间")
    private String code;

    @NotBlank(message = "权限名称不能为空")
    @Size(min = 2, max = 100, message = "权限名称长度必须在2-100位之间")
    private String name;

    @Size(max = 255, message = "权限描述长度不能超过255位")
    private String description;

    @NotBlank(message = "所属模块不能为空")
    @Size(max = 100, message = "所属模块长度不能超过100位")
    private String module;
}
