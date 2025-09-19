package com.example.vnollxonlinejudge.model.vo.notification;

import com.example.vnollxonlinejudge.model.entity.Notification;
import lombok.Data;

@Data
public class NotificationVo {
    private Long id;
    private String title;
    private String description;
    private String createTime;
    private Boolean is_read;
    private Long commentId;
    public NotificationVo(){}
    public NotificationVo(Notification notification){
        this.id=notification.getId();
        this.is_read=notification.getIsRead();
        this.title=notification.getTitle();
        this.description=notification.getDescription();
        this.createTime=notification.getCreateTime();
        this.commentId=notification.getCommentId();
    }
}
