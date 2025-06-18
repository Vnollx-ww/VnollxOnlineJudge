package com.example.vnollxonlinejudge.mapper;

import com.example.vnollxonlinejudge.domain.Solve;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface SolveMapper {
    @Select("SELECT * FROM solves WHERE pid = #{pid}")
    List<Solve> getAllSolves(long pid);
    @Select("SELECT * FROM solves WHERE id = #{id}")
    Solve getSolve(long id);

    @Insert("INSERT INTO solves(content,name,create_time,uid,pid,title,problem_name) VALUES(#{content}, #{name},#{create_time},#{uid},#{pid},#{title},#{pname})")
    void insertSolve(String content,String name,String create_time,long uid,long pid,String title,String pname);
}
