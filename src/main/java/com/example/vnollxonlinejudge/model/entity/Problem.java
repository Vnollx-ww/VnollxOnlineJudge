package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import jakarta.persistence.*;
import lombok.Data;

@TableName("problem")
@Data
public class Problem {
    @TableId(type = IdType.AUTO)
    private Long id;

    @Column(name = "title")
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "time_limit")
    private int timeLimit;

    @Column(name = "memory_limit")
    private int memoryLimit;

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
    private int submitCount;

    @Column(name = "pass_count")
    private int passCount;

    @Column(name = "open")
    private boolean open;
    @Column(name = "version")
    private int version;
}
