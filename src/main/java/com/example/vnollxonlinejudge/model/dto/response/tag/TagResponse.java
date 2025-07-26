package com.example.vnollxonlinejudge.model.dto.response.tag;

import com.example.vnollxonlinejudge.model.entity.Tag;
import lombok.Data;

@Data
public class TagResponse {
    private long id;
    private String name;
    public TagResponse(){}
    public TagResponse(Tag tag){
        this.id=tag.getId();
        this.name=tag.getName();
    }
}
