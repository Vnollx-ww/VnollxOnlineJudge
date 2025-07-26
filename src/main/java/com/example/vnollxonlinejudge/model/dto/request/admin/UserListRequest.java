package com.example.vnollxonlinejudge.model.dto.request.admin;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserListRequest {
    @NotNull(message = "页码不能为空")
    @Min(value = 1, message = "页码必须大于0")
    private Integer pageNum;

    @NotNull(message = "页面大小不能为空")
    @Min(value = 1, message = "页面大小必须大于0")
    private Integer pageSize;

    private String keyword;


}