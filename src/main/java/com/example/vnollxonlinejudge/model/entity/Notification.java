package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
@TableName("notification")
@Data
public class Notification {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String title;
    private String description;
    private String createTime;
    private Long uid;
    private Boolean isRead;
    private Long commentId;
    public Notification(){}
    public Notification(String title,String description,String createTime,Long uid){
        this.title=title;
        this.description=description;
        this.createTime=createTime;
        this.uid=uid;
    }
}
