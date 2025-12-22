package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.Data;

@Data
public class AdminSavePracticeDTO {
    private Long id;
    private String title;
    private String description;
    private Boolean isPublic;
}
