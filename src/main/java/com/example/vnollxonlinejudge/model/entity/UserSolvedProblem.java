package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "user_solver_problem")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSolvedProblem {
    @Column(name = "user_id")
    private Long userId;
    @Column(name = "problem_id")
    private Long problemId;

    @Column(name= "competition_id")
    private Long competitionId;
}
