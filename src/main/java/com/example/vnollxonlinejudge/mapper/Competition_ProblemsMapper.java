package com.example.vnollxonlinejudge.mapper;

import com.example.vnollxonlinejudge.domain.Competition_Problem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface Competition_ProblemsMapper{
    @Select("SELECT * FROM competition_problems WHERE competition_id=#{cid}")
    List<Competition_Problem> getProblemList(Long cid);

    @Update("UPDATE competition_problems " +
            "SET pass_count = pass_count + #{ok}, " +  // 用逗号分隔字段，参数用#{ok}
            "submit_count = submit_count + 1 " +    // 提交次数直接+1（假设每次提交都计数）
            "WHERE problem_id = #{pid} And competition_id=#{cid}")
    void updatePassCount(long pid,int ok,long cid);
    @Update("UPDATE competition_problems " +
            "SET pass_count = pass_count + #{ok1}, " +  // 用逗号分隔字段，参数用#{ok}
            "submit_count = submit_count + #{ok2} " +    // 提交次数直接+1（假设每次提交都计数）
            "WHERE problem_id = #{pid} And competition_id=#{cid} ")
    void updateCount(long pid,int ok1,int ok2,long cid);

}
