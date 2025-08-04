package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import jakarta.persistence.*;
import lombok.Data;

@Table(name = "user")
@Data
public class User {
    // 注意属性名要与数据表中的字段名一致
    // 主键自增int(10)对应long
    @TableId(type = IdType.AUTO)
    private Long id;

    @Column(name = "penalty_time")
    private int penaltyTime;
    @Column(name="salt")
    private String salt;
    @Column(name = "name")
    private String name;

    @Column(name = "password")
    private String password;
    @Column(name = "email")
    private String email;
    @Column(name = "submit_count")
    private int submitCount;

    @Column(name = "pass_count")
    private int passCount;
    @Column(name = "version")
    private int version;

    @Column(name="identity")
    private String identity;
    public User(String name,String password,String email){
        this.name=name;
        this.password=password;
        this.email=email;
    }
    public User(){}
}