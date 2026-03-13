package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.Data;

@Data
public class ProblemExampleItemDTO {
    private String input;
    private String output;
    private Integer sortOrder;
}
