package com.example.vnollxonlinejudge.convert;

import com.example.vnollxonlinejudge.model.entity.Tag;
import com.example.vnollxonlinejudge.model.vo.tag.TagVo;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TagConvert {
    TagConvert INSTANCE = Mappers.getMapper(TagConvert.class);

    TagVo toVo(Tag tag);

    List<TagVo> toVoList(List<Tag> list);
}
