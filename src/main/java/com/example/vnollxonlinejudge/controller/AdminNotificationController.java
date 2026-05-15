package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.entity.Notification;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveNotificationDTO;
import com.example.vnollxonlinejudge.model.vo.notification.NotificationVo;
import com.example.vnollxonlinejudge.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.example.vnollxonlinejudge.utils.UserContextHolder;

@RestController
@RequestMapping("/api/v1/admin/notification")
@Validated
public class AdminNotificationController {
    private final NotificationService notificationService;
    
    @Autowired
    public AdminNotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PutMapping("/update/{id}")
    @RequirePermission(PermissionCode.NOTIFICATION_CREATE)
    public Result<NotificationVo> updateNotification(@RequestBody AdminSaveNotificationDTO req, @Valid @PathVariable Long id){
        return Result.Success(notificationService.updateNotification(id,req.getTitle(),req.getDescription()), "修改通知成功");
    }
    @PostMapping("/send")
    @RequirePermission(PermissionCode.NOTIFICATION_CREATE)
    public Result<List<NotificationVo>> sendNotification(@RequestBody AdminSaveNotificationDTO req) {
        Long userId = UserContextHolder.getCurrentUserId();

        Notification notification = Notification.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .createTime(req.getCreateTime())
                .build();

        return Result.Success(notificationService.sendTargetedNotification(notification, userId, req.getTargetUserIds()), "发送通知成功");
    }
}
