package com.example.vnollxonlinejudge.model.vo.judge;

import lombok.Data;

@Data
public class JudgeResultVO {
    private String status;
    private String errorInfo;
    private Integer passCount;
    private Integer testCount;
}
