package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.notification.NotificationVo;
import com.example.vnollxonlinejudge.service.NotificationService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notification")
@Validated
public class NotificationController {
    private final NotificationService notificationService;
    
    @Autowired
    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/list")
    @RequirePermission(PermissionCode.NOTIFICATION_VIEW)
    public Result<List<NotificationVo>> getNotificationList(
            @RequestParam String pageNum, @RequestParam String pageSize,
            @RequestParam(required = false)String keyword, 
            @RequestParam(required = false)String status
    ){
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(
                notificationService.getNotificationList(
                        userId, Integer.parseInt(pageNum),Integer.parseInt(pageSize), keyword, status
                )
                ,"查询通知列表成功"
        );
    }
    @GetMapping("/count")
    @RequirePermission(PermissionCode.NOTIFICATION_VIEW)
    public Result<Long> getNotificationCount(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword
    ){
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(notificationService.getNotificationCount(userId,status,keyword),"获取未读通知数量成功");
    }
    @DeleteMapping("/delete/{id}")
    @RequirePermission(PermissionCode.NOTIFICATION_VIEW)
    public Result<Void> deleteNotification(
           @PathVariable String id
    ){
        notificationService.deleteNotification(Long.parseLong(id));
        return Result.Success("删除通知成功");
    }
    @GetMapping("/info")
    @RequirePermission(PermissionCode.NOTIFICATION_VIEW)
    public Result<NotificationVo> getNotificationInfo(
            @RequestParam String nid
    ){
        return Result.Success(notificationService.getNotificationInfo(Long.parseLong(nid)));
    }

    @PutMapping("/read/{id}")
    @RequirePermission(PermissionCode.NOTIFICATION_VIEW)
    public Result<Void> markAsRead(@PathVariable String id){
        notificationService.markAsRead(Long.parseLong(id));
        return Result.Success("标记已读成功");
    }

}
