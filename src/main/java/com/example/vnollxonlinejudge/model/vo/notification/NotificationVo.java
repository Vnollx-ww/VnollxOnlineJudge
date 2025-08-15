package com.example.vnollxonlinejudge.model.vo.notification;

import com.example.vnollxonlinejudge.model.entity.Notification;
import lombok.Data;

@Data
public class NotificationVo {
    private Long id;
    private String title;
    private String description;
    private String createTime;
    private String author;
    public NotificationVo(){}
    public NotificationVo(Notification notification){
        this.id=notification.getId();
        this.title=notification.getTitle();
        this.author=notification.getAuthor();
        this.description=notification.getDescription();
        this.createTime=notification.getCreateTime();
    }
}
