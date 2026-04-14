package com.example.vnollxonlinejudge.model.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminSaveRoleDTO {
    @NotBlank(message = "角色码不能为空")
    @Size(min = 2, max = 50, message = "角色码长度必须在2-50位之间")
    private String code;

    @NotBlank(message = "角色名称不能为空")
    @Size(min = 2, max = 100, message = "角色名称长度必须在2-100位之间")
    private String name;

    @Size(max = 255, message = "角色描述长度不能超过255位")
    private String description;
}
