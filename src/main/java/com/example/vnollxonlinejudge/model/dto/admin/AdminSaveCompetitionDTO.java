package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.Data;

@Data
public class AdminSaveCompetitionDTO {
    private Long id;
    private String title;
    private String description;
    private String beginTime;
    private String endTime;
    private String password;
    private Boolean needPassword;
}
