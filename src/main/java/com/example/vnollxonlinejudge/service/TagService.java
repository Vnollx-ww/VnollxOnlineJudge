package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.vo.tag.TagVo;

import java.util.List;

public interface TagService {
    void createTag(String name);
    void deleteTag(Long id);

    List<TagVo> getTagList();
}
