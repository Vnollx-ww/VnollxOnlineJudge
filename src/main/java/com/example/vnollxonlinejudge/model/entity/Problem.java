package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Data;

@TableName("problem")
@Data
@Builder
public class Problem {
    @TableId(type = IdType.AUTO)
    private Long id;

    @Column(name = "title")
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "time_limit")
    private Integer timeLimit;

    @Column(name = "memory_limit")
    private Integer memoryLimit;

    @Column(name = "difficulty")
    private String difficulty;

    @Column(name = "input_example")
    private String inputExample;

    @Column(name = "output_example")
    private String outputExample;

    @Column(name = "datazip")
    private String datazip;

    @Column(name = "hint")
    private String hint;

    @Column(name = "input_format")
    private String inputFormat;

    @Column(name = "output_format")
    private String outputFormat;

    @Column(name = "submit_count")
    private Integer submitCount;

    @Column(name = "pass_count")
    private Integer passCount;

    @Column(name = "open")
    private Boolean open;
    @Column(name = "version")
    private Integer version;
    public Problem(){}
    public Problem(
            String title,
            String description,int timeLimit,
            int memoryLimit,String difficulty,
            String inputFormat,String outputFormat,
            String inputExample,String outputExample,
            String hint,Boolean open
    ){
        this.title=title;
        this.description=description;
        this.timeLimit=timeLimit;
        this.memoryLimit=memoryLimit;
        this.difficulty=difficulty;
        this.inputFormat=inputFormat;
        this.outputFormat=outputFormat;
        this.inputExample=inputExample;
        this.outputExample=outputExample;
        this.hint=hint;
        this.open=open;
    }
}
