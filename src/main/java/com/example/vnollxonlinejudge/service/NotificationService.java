package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.Notification;
import com.example.vnollxonlinejudge.model.vo.notification.NotificationVo;

import java.util.List;

public interface NotificationService {
    void sendNotification(Notification notification,Long uid);
    void updateNotification(Long id,String title,String description);
    void deleteNotification(Long id);
    List<NotificationVo> getNotificationList(Long uid,int pageNum, int pageSize, String keyword, String status);
    Long getNotificationCount(Long uid,String status,String keyword);
    NotificationVo getNotificationInfo(Long nid);
    void markAsRead(Long id);
}
