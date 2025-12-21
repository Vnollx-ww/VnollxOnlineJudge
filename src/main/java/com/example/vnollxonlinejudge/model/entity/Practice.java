package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "practice")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Practice {
    @TableId(type = IdType.AUTO)
    private Long id;
    
    @Column(name = "title")
    private String title;
    
    @Column(name = "description")
    private String description;
    
    @Column(name = "create_time")
    private String createTime;
    
    @Column(name = "is_public")
    private Boolean isPublic;
}
