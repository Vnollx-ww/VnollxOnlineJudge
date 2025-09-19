package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.NotificationMapper;
import com.example.vnollxonlinejudge.model.vo.notification.NotificationVo;
import com.example.vnollxonlinejudge.model.entity.Notification;
import com.example.vnollxonlinejudge.service.NotificationService;
import com.example.vnollxonlinejudge.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl extends ServiceImpl<NotificationMapper, Notification> implements NotificationService {
    private final UserService userService;
    @Override
    @Transactional
    public void sendNotification(Notification notification, Long uid) {
        if (!uid.equals(0L)) {
            List<Notification> notificationList = userService.getUserIdList(uid).stream()
                    .map(id -> new Notification(
                            notification.getTitle(),
                            notification.getDescription(),
                            notification.getCreateTime(),
                            (long)id
                    ))
                    .collect(Collectors.toList());
            this.saveBatch(notificationList);
        } else {
            this.save(notification);
        }
    }

    @Override
    public void updateNotification(Long id, String title, String description) {
        UpdateWrapper<Notification> updateWrapper=new UpdateWrapper<>();
        updateWrapper.eq("id",id).set("title",title).set("description",description);
        this.update(updateWrapper);
    }


    @Override
    public void deleteNotification(Long id) {
        QueryWrapper<Notification>wrapper=new QueryWrapper<>();
        wrapper.eq("id",id);
        if (this.count()==0){
            throw new BusinessException("通知不存在或已被删除");
        }
        this.baseMapper.deleteById(id);
    }

    @Override
    public List<NotificationVo> getNotificationList(Long uid,int pageNum, int pageSize, String keyword, String status) {
        Page<Notification> page = new Page<>(pageNum, pageSize);
        QueryWrapper<Notification>wrapper=new QueryWrapper<>();
        wrapper.eq("uid", uid);
        if (StringUtils.isNotBlank(keyword)){
            wrapper.like("title",keyword);
        }
        if (StringUtils.isNotBlank(status)){
            if (status.equals("false")){
                wrapper.eq("is_read",false);
            } else if (status.equals("true")){
                wrapper.eq("is_read",true);
            }
        }
        wrapper.orderByDesc("create_time");
        Page<Notification> result = this.page(page,wrapper);
        return result.getRecords().stream()
                .map(NotificationVo::new)
                .collect(Collectors.toList());
    }

    @Override
    public Long getNotificationCount(Long uid,String status,String keyword) {
        QueryWrapper<Notification>wrapper=new QueryWrapper<>();
        wrapper.eq("uid",uid);
        if (StringUtils.isNotBlank(keyword)){
            wrapper.like("title",keyword);
        }
        if (StringUtils.isNotBlank(status)){
            if (status.equals("false")){
                wrapper.eq("is_read",false);
            }
        }
        return this.count(wrapper);
    }

    @Override
    public NotificationVo getNotificationInfo(Long nid) {
        UpdateWrapper<Notification> updateWrapper=new UpdateWrapper<>();
        updateWrapper.eq("id",nid).set("is_read",true);
        return new NotificationVo(this.getById(nid));
    }

    @Override
    public void markAsRead(Long id) {
        UpdateWrapper<Notification> updateWrapper = new UpdateWrapper<>();
        updateWrapper.eq("id", id).set("is_read", true);
        this.update(updateWrapper);
    }
}
