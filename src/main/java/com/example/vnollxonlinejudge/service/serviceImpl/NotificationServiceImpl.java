package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.NotificationMapper;
import com.example.vnollxonlinejudge.model.dto.response.notification.NotificationResponse;
import com.example.vnollxonlinejudge.model.entity.Notification;
import com.example.vnollxonlinejudge.service.NotificationService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationServiceImpl extends ServiceImpl<NotificationMapper, Notification> implements NotificationService {

    @Override
    public void createNotification(String title, String description, String name) {
        Notification notification=new Notification();
        notification.setDescription(description);
        notification.setTitle(title);
        notification.setAuthor(name);
        this.save(notification);
    }

    @Override
    public void updateNotification(long id, String title, String description) {
        QueryWrapper<Notification>wrapper=new QueryWrapper<>();
        wrapper.eq("id",id);
        Notification notification=this.getOne(wrapper);
        if (notification==null){
            throw new BusinessException("通知不存在或已被删除");
        }
        notification.setTitle(title);
        notification.setDescription(description);
        this.updateById(notification);
    }

    @Override
    public void deleteNotification(long id) {
        QueryWrapper<Notification>wrapper=new QueryWrapper<>();
        wrapper.eq("id",id);
        if (this.count()==0){
            throw new BusinessException("通知不存在或已被删除");
        }
        this.baseMapper.deleteById(id);
    }

    @Override
    public List<NotificationResponse> getNotificationList(int pageNum, int pageSize,String keyword) {
        Page<Notification> page = new Page<>(pageNum, pageSize);
        QueryWrapper<Notification>wrapper=new QueryWrapper<>();
        if (StringUtils.isNotBlank(keyword)){
            wrapper.like("title",keyword);
        }
        Page<Notification> result = this.page(page,wrapper);
        return result.getRecords().stream()
                .map(NotificationResponse::new)
                .collect(Collectors.toList());
    }

    @Override
    public Long getNotificationCount(String keyword) {
        QueryWrapper<Notification>wrapper=new QueryWrapper<>();
        if (StringUtils.isNotBlank(keyword)){
            wrapper.like("title",keyword);
        }
        return this.count(wrapper);
    }
}
