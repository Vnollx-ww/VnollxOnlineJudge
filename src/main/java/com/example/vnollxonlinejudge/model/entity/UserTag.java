package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "user_tag")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserTag {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long uid;

    private String tag;

    private Long submitCount;

    private Long passCount;
}
