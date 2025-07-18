package com.example.vnollxonlinejudge.domain;

import jakarta.persistence.*;
import lombok.Data;

@Table(name = "user_solver_problem")
@Data
public class UserSolvedProblem {
    @Column(name = "user_id")
    private long userId;
    @Column(name = "problem_id")
    private long problemId;

    @Column(name= "competition_id")
    private long competitionId;
}
