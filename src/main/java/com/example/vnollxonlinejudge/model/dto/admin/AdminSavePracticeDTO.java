package com.example.vnollxonlinejudge.model.dto.admin;

import java.util.List;
import lombok.Data;

@Data
public class AdminSavePracticeDTO {
    private Long id;
    private String title;
    private String description;
    private Boolean isPublic;
    private List<Long> classIds;
}
