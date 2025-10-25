package com.example.vnollxonlinejudge.model.vo.problem;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProblemBasicVo {
    private Long id;
    private String title;
    private String difficulty;
}
