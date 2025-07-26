package com.example.vnollxonlinejudge.model.dto.response.notification;

import com.example.vnollxonlinejudge.model.entity.Notification;
import lombok.Data;

@Data
public class NotificationResponse {
    private long id;
    private String title;
    private String description;
    private String createTime;
    private String author;
    public NotificationResponse(){}
    public NotificationResponse(Notification notification){
        this.id=notification.getId();
        this.title=notification.getTitle();
        this.author=notification.getAuthor();
        this.description=notification.getDescription();
        this.createTime=notification.getCreateTime();
    }
}
