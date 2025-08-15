package com.example.vnollxonlinejudge.model.vo.tag;

import com.example.vnollxonlinejudge.model.entity.Tag;
import lombok.Data;

@Data
public class TagVo {
    private Long id;
    private String name;
    public TagVo(){}
    public TagVo(Tag tag){
        this.id=tag.getId();
        this.name=tag.getName();
    }
}
