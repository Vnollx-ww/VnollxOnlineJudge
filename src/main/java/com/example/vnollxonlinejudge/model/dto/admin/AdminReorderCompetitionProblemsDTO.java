package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.Data;

import java.util.List;

@Data
public class AdminReorderCompetitionProblemsDTO {
    private Long cid;
    private List<Long> problemIds;
}
