package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.mapper.UserTagMapper;
import com.example.vnollxonlinejudge.model.entity.UserTag;
import com.example.vnollxonlinejudge.service.UserTagService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class UserTagServiceImpl extends ServiceImpl<UserTagMapper, UserTag> implements UserTagService {
    @Override
    public List<UserTag> getUserTagPassStatusList(Long userId) {
        QueryWrapper<UserTag> queryWrapper=new QueryWrapper<>();
        queryWrapper.eq("uid",userId);
        return this.list();
    }

    @Override
    @Transactional
    public void updateTagPassStatus(Long userId, List<String> tagList, Long isPass) {
        if (tagList == null || tagList.isEmpty()) {
            return;
        }

        List<UserTag> userTagsToSaveOrUpdate = new ArrayList<>();

        for (String tag : tagList) {
            // 先查询记录是否存在
            UserTag userTag = this.lambdaQuery()
                    .eq(UserTag::getUid, userId)
                    .eq(UserTag::getTag, tag)
                    .one();

            if (userTag == null) {
                UserTag newUserTag = new UserTag();
                newUserTag.setUid(userId);
                newUserTag.setTag(tag);
                newUserTag.setSubmitCount(1L);
                newUserTag.setPassCount(isPass);
                userTagsToSaveOrUpdate.add(newUserTag);
            } else {
                userTag.setSubmitCount(userTag.getSubmitCount() + 1);
                userTag.setPassCount(userTag.getPassCount() + isPass);
                userTagsToSaveOrUpdate.add(userTag);
            }
        }
        // 批量保存或更新
        this.saveOrUpdateBatch(userTagsToSaveOrUpdate);
    }
}
