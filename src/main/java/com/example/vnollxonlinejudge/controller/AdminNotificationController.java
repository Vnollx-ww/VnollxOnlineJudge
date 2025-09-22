package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.entity.Notification;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveNotificationDTO;
import com.example.vnollxonlinejudge.model.vo.notification.NotificationVo;
import com.example.vnollxonlinejudge.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.example.vnollxonlinejudge.utils.UserContextHolder;

@RestController
@RequestMapping("/admin/notification")
@Validated
@RequiredArgsConstructor
public class AdminNotificationController {
    private final NotificationService notificationService;

    @PutMapping("/update/{id}")
    public Result<Void> updateNotification(@RequestBody AdminSaveNotificationDTO req, @Valid @PathVariable Long id){
        notificationService.updateNotification(id,req.getTitle(),req.getDescription());
        return Result.Success("修改通知成功");
    }
    @PostMapping("/send")
    public Result<Void> sendNotification(@RequestBody AdminSaveNotificationDTO req){
        Long userId = UserContextHolder.getCurrentUserId();
        notificationService.sendNotification(
                new Notification(
                        req.getTitle(),req.getDescription(),req.getCreateTime(),0L
                ),userId
        );
        return Result.Success("创建通知成功");
    }
}
