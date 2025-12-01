package com.example.vnollxonlinejudge.convert;

import com.example.vnollxonlinejudge.model.entity.Notification;
import com.example.vnollxonlinejudge.model.vo.notification.NotificationVo;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring")
public interface NotificationConvert {
    NotificationConvert INSTANCE = Mappers.getMapper(NotificationConvert.class);

    @Mapping(source = "isRead", target = "is_read")
    NotificationVo toVo(Notification notification);

    List<NotificationVo> toVoList(List<Notification> list);
}
