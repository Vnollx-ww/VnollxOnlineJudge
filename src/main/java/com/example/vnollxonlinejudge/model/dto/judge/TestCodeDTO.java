package com.example.vnollxonlinejudge.model.dto.judge;

import lombok.Data;

@Data
public class TestCodeDTO {
    private String code;
    private String pid;
    private String option;
    private String inputExample;
    private String outputExample;
    private String time;
    private String memory;
}
