package com.example.vnollxonlinejudge.domain;

import jakarta.persistence.*;
import lombok.Data;

@Table(name = "competition_problem")
@Data
public class CompetitionProblem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long  id;
    @Column(name = "problem_id")
    private Long  problemId;

    @Column(name = "pass_count")
    private int passCount;
    @Column(name = "submit_count")
    private int submitCount;

    @Column(name = "competition_id")
    private long competitionId;
}
