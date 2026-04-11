package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.Data;

@Data
public class AdminSaveStudentClassDTO {
    private Long id;
    private String className;
    private Long teacherId;
}
