package com.example.vnollxonlinejudge.model.dto.request.admin;

import lombok.Data;
import org.springframework.web.bind.annotation.RequestParam;

@Data
public class AdminSaveCompetitionRequest {
    private Long id;
    private String title;
    private String description;
    private String beginTime;
    private String endTime;
    private String password;
    private boolean needPassword;
}
