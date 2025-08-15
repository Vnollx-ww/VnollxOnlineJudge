package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.Data;

@Table(name = "competition_problem")
@Data
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
