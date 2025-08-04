package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.response.tag.TagResponse;

import java.util.List;

public interface TagService {
    void createTag(String name);
    void deleteTag(long id);

    List<TagResponse> getTagList();
    TagResponse getTag(String name);
}
