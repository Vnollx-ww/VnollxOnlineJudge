package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Table(name = "user")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    // 注意属性名要与数据表中的字段名一致
    // 主键自增int(10)对应Long
    @TableId(type = IdType.AUTO)
    private Long id;

    @Column(name = "penalty_time")
    private Integer penaltyTime;
    @Column(name="salt")
    private String salt;
    @Column(name = "name")
    private String name;

    @Column(name = "password")
    private String password;
    @Column(name = "email")
    private String email;
    @Column(name = "submit_count")
    private Integer submitCount;

    @Column(name = "pass_count")
    private Integer passCount;
    @Column(name = "version")
    private Integer version;

    @Column(name="identity")
    private String identity;

    @Column(name="avatar")
    private String avatar;

    @Column(name="signature")
    private String signature;

    @Column(name="last_login_time")
    private LocalDateTime lastLoginTime;
}