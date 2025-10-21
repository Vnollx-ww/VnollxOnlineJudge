package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.UserTag;

import java.util.List;

public interface UserTagService {

    List<UserTag> getUserTagPassStatusList(Long userId);

    void updateTagPassStatus(Long userId,List<String> tagList,Long isPass);
}
