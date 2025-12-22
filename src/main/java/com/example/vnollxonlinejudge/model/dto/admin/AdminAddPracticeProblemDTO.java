package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.Data;
import java.util.List;

@Data
public class AdminAddPracticeProblemDTO {
    private String practiceId;
    private List<String> problemIds;
}
