package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.TagMapper;
import com.example.vnollxonlinejudge.model.dto.response.tag.TagResponse;
import com.example.vnollxonlinejudge.model.dto.response.user.UserResponse;
import com.example.vnollxonlinejudge.model.entity.Tag;
import com.example.vnollxonlinejudge.service.ProblemTagService;
import com.example.vnollxonlinejudge.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TagServiceImpl extends ServiceImpl<TagMapper, Tag> implements TagService {
    @Autowired
    private ProblemTagService problemTagService;
    @Override
    public void createTag(String name) {
        QueryWrapper<Tag> wrapper=new QueryWrapper<>();
        wrapper.eq("name",name);
        if (this.count(wrapper)>0){
            return ;
        }
        Tag tag=new Tag();
        tag.setName(name);
        this.save(tag);
    }

    @Override
    @Transactional
    public void deleteTag(long id) {
        QueryWrapper<Tag> wrapper=new QueryWrapper<>();
        wrapper.eq("id",id).select("name");
        Tag tag=this.baseMapper.selectOne(wrapper);
        if (tag==null){
            throw new BusinessException("标签不存在或已被删除");
        }
        problemTagService.deleteRelated(tag.getName());
        this.baseMapper.deleteById(id);
    }

    @Override
    public List<TagResponse> getTagList() {
        return this.list().stream()
                .map(TagResponse::new)  // 或者 user -> new UserResponse(user)
                .collect(Collectors.toList());
    }

    @Override
    public TagResponse getTag(String name) {
        QueryWrapper<Tag> wrapper=new QueryWrapper<>();
        wrapper.eq("name",name);
        return new TagResponse(this.getOne(wrapper));
    }
}
