package com.example.vnollxonlinejudge.convert;

import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserConvert {
    UserConvert INSTANCE = Mappers.getMapper(UserConvert.class);

    UserVo toVo(User user);

    List<UserVo> toVoList(List<User> list);
}
