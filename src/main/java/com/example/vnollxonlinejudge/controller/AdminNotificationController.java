package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveNotificationDTO;
import com.example.vnollxonlinejudge.model.vo.notification.NotificationVo;
import com.example.vnollxonlinejudge.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/notification")
@Validated
@RequiredArgsConstructor
public class AdminNotificationController {
    private final NotificationService notificationService;
    @GetMapping("/list")
    public Result<List<NotificationVo>> getNotificationList(
            @RequestParam String pageNum,@RequestParam String pageSize,
            @RequestParam(required = false) String keyword
            ){
        return Result.Success(
                notificationService.getNotificationList(Integer.parseInt(pageNum),Integer.parseInt(pageSize),keyword)
                ,"查询通知列表成功"
        );
    }
    @DeleteMapping("/delete/{id}")
    public Result<Void> deleteNotification(@Valid @PathVariable Long id){
        notificationService.deleteNotification(id);
        return Result.Success("删除通知成功");
    }
    @PutMapping("/update/{id}")
    public Result<Void> updateNotification(@RequestBody AdminSaveNotificationDTO req, @Valid @PathVariable Long id){
        notificationService.updateNotification(id,req.getTitle(),req.getDescription());
        return Result.Success("修改通知成功");
    }
    @PostMapping("/create")
    public Result<Void> createNotification(@RequestBody AdminSaveNotificationDTO req){
        notificationService.createNotification(req.getTitle(),req.getDescription(),req.getAuthor());
        return Result.Success("创建通知成功");
    }
    @GetMapping("/count")
    public Result<Long> getNotificationCount(@RequestParam(required = false) String keyword){
        return Result.Success(notificationService.getNotificationCount(keyword),"获取通知总数成功");
    }
}
