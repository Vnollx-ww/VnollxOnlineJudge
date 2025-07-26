package com.example.vnollxonlinejudge.model.dto.request.admin;

import lombok.Data;

@Data
public class AdminSaveNotificationRequest {
    private String id;
    private String title;
    private String description;
    private String author;
}
