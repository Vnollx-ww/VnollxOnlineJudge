package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.vo.notification.NotificationVo;

import java.util.List;

public interface NotificationService {
    void createNotification(String title,String description,String name);
    void updateNotification(Long id,String title,String description);
    void deleteNotification(Long id);
    List<NotificationVo> getNotificationList(int pageNum, int pageSize, String keyword);
    Long getNotificationCount(String keyword);
}
