package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.response.notification.NotificationResponse;

import java.util.List;

public interface NotificationService {
    void createNotification(String title,String description,String name);
    void updateNotification(long id,String title,String description);
    void deleteNotification(long id);
    List<NotificationResponse> getNotificationList(int pageNum,int pageSize,String keyword);
    Long getNotificationCount(String keyword);
}
