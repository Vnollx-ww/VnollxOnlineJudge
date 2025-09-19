package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.notification.NotificationVo;
import com.example.vnollxonlinejudge.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notification")
@Validated
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private Long getCurrentUserId(HttpServletRequest request) {
        String userId = (String) request.getAttribute("uid");
        if (userId == null || userId.trim().isEmpty()) {
            throw new BusinessException("未获取到用户ID");
        }
        try {
            return Long.parseLong(userId);
        } catch (NumberFormatException e) {
            throw new BusinessException("用户ID格式错误");
        }
    }

    @GetMapping("/list")
    public Result<List<NotificationVo>> getNotificationList(
            @RequestParam String pageNum, @RequestParam String pageSize,
            @RequestParam(required = false)String keyword, 
            @RequestParam(required = false)String status,
            HttpServletRequest httpRequest
    ){
        Long userId = getCurrentUserId(httpRequest);
        return Result.Success(
                notificationService.getNotificationList(
                        userId, Integer.parseInt(pageNum),Integer.parseInt(pageSize), keyword, status
                )
                ,"查询通知列表成功"
        );
    }
    @GetMapping("/count")
    public Result<Long> getNotificationCount(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            HttpServletRequest httpRequest
    ){
        Long userId = getCurrentUserId(httpRequest);
        return Result.Success(notificationService.getNotificationCount(userId,status,keyword),"获取未读通知数量成功");
    }
    @DeleteMapping("/delete/{id}")
    public Result<Void> deleteNotification(
           @PathVariable String id
    ){
        notificationService.deleteNotification(Long.parseLong(id));
        return Result.Success("删除通知成功");
    }
    @GetMapping("/info")
    public Result<NotificationVo> getNotificationInfo(
            @RequestParam String nid
    ){
        return Result.Success(notificationService.getNotificationInfo(Long.parseLong(nid)));
    }

    @PutMapping("/read/{id}")
    public Result<Void> markAsRead(@PathVariable String id){
        notificationService.markAsRead(Long.parseLong(id));
        return Result.Success("标记已读成功");
    }

}
