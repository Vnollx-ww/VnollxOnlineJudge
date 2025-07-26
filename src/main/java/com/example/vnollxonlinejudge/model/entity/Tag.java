package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.Data;

@Table(name = "tag")
@Data
public class Tag {
    @TableId(type = IdType.AUTO)
    private Long id;
    @Column(name = "name")
    private String name;

}
