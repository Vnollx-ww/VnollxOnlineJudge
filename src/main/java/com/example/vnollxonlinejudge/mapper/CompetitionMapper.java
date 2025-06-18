package com.example.vnollxonlinejudge.mapper;

import com.example.vnollxonlinejudge.domain.Competition;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.checkerframework.checker.units.qual.C;

import java.util.List;

@Mapper
public interface CompetitionMapper {
    @Select("SELECT * from competitions WHERE id= #{id}")
    Competition getCompetitionById(long id);

    @Insert("INSERT INTO competitions(title,description,begin_time,end_time,password,need_password) VALUES(#{title}, #{description},#{begin_time},#{end_time},#{password},#{need_password})")
    void createCompetition(String title,String description,String begin_time,String end_time,String password,boolean need_password);

    @Select("SELECT * from competitions")
    List<Competition> getCompetitionList();

    @Select("SELECT begin_time from competitions WHERE id=#{id}")
    String getBeginTimeById(long id);
    @Select("SELECT end_time from competitions WHERE id=#{id}")
    String getEndTimeById(long id);

}
