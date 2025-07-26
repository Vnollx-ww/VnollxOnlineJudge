package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.model.dto.response.notification.NotificationResponse;
import com.example.vnollxonlinejudge.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/notification")
@Validated
public class NotificationController {
    @Autowired
    private NotificationService notificationService;
    @GetMapping("/list")
    public Result<List<NotificationResponse>> getNotificationList(
            @RequestParam String pageNum, @RequestParam String pageSize,
            @RequestParam(required = false)String keyword
    ){
        return Result.Success(
                notificationService.getNotificationList(
                        Integer.parseInt(pageNum),Integer.parseInt(pageSize),
                        keyword
                )
                ,"查询通知列表成功"
        );
    }
}
