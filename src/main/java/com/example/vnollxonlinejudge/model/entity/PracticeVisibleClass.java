package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@TableName("practice_visible_class")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PracticeVisibleClass {
    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("practice_id")
    private Long practiceId;

    @TableField("class_id")
    private Long classId;
}
