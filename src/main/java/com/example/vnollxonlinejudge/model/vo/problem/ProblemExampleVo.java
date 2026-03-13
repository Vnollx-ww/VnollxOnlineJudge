package com.example.vnollxonlinejudge.model.vo.problem;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProblemExampleVo {
    private Long id;
    private String input;
    private String output;
    private Integer sortOrder;
}
