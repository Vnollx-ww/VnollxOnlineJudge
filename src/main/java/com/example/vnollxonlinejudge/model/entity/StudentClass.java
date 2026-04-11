package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@TableName("student_class")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentClass {
    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("class_name")
    private String className;

    @TableField("teacher_id")
    private Long teacherId;

    @TableField("create_time")
    private String createTime;
}
