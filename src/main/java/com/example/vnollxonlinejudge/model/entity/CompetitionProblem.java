package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "competition_problem")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitionProblem {
    @TableId(type = IdType.AUTO)
    private Long  id;
    @Column(name = "problem_id")
    private Long  problemId;

    @Column(name = "pass_count")
    private Integer passCount;
    @Column(name = "submit_count")
    private Integer submitCount;

    @Column(name = "competition_id")
    private Long competitionId;
}
