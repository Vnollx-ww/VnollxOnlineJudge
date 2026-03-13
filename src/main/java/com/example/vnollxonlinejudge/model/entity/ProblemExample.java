package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@TableName("problem_example")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProblemExample {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long problemId;
    private String input;
    private String output;
    private Integer sortOrder;
    @TableField("is_public")
    private Boolean isPublic;
}
