package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.Data;

import java.util.List;

@Data
public class AdminSaveNotificationDTO {
    private String title;
    private String description;
    private String createTime;
    private List<Long> targetUserIds;
}
