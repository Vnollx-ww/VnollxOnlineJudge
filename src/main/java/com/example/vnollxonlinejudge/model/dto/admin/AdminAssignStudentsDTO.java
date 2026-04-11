package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.Data;

import java.util.List;

@Data
public class AdminAssignStudentsDTO {
    private List<Long> studentIds;
}
