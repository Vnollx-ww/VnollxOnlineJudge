package com.example.vnollxonlinejudge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.domain.Submission;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface SubmissionMapper extends BaseMapper<Submission> {


    @Select("SELECT * FROM submission " +
            "WHERE cid = 0 " +
            "AND (status = #{status} OR COALESCE(#{status}, '') = '') " +
            "AND (language = #{language} OR COALESCE(#{language}, '') = '') " +
            "ORDER BY id DESC " +
            "LIMIT #{size} OFFSET #{offset}")
    List<Submission> getSubmissionByStatusAndLanguage(String status, String language, int offset,int size);


    @Select("SELECT COUNT(*) FROM submission " +
            "WHERE cid = 0 " +
            "AND (status = #{status} OR COALESCE(#{status}, '') = '') " +
            "AND (language = #{language} OR COALESCE(#{language}, '') = '') ")
    int getCountByStatusAndLanguage( String status,  String language);

    void batchInsert(List<Submission> submissions);
}

