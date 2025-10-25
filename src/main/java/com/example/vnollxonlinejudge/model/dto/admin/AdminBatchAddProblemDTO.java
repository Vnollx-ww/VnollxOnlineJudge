package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.Data;

import java.util.List;

@Data
public class AdminBatchAddProblemDTO {
    private String cid;
    private List<String> pids;
}
