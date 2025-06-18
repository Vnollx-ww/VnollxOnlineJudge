package com.example.vnollxonlinejudge.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface Problem_TagsMapper {
    @Select("SELECT tag_name FROM problem_tags WHERE problem_id = #{pid}")
    List<String> getTagNames(long pid);
}
