package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "practice_problem")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PracticeProblem {
    @TableId(type = IdType.AUTO)
    private Long id;
    
    @Column(name = "practice_id")
    private Long practiceId;
    
    @Column(name = "problem_id")
    private Long problemId;
    
    @Column(name = "problem_order")
    private Integer problemOrder;
}
