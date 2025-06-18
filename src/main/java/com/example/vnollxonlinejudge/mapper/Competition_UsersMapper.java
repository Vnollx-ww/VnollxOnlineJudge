package com.example.vnollxonlinejudge.mapper;

import com.example.vnollxonlinejudge.domain.Competition_Problem;
import com.example.vnollxonlinejudge.domain.Competition_User;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface Competition_UsersMapper {
    @Select("SELECT * FROM competition_users WHERE competition_id=#{cid}")
    List<Competition_User> getUserList(Long cid);
    @Select("SELECT * FROM competition_users WHERE competition_id=#{cid} And user_id=#{uid}")
    Competition_User getUser(Long cid,Long uid);
    @Update("UPDATE competition_users " +
            "SET pass_count = pass_count + #{ok} " + // 去掉逗号
            "WHERE name = #{name}")
    void updatePassCount(String name,int ok);
    @Update("UPDATE competition_users " +
            "SET penalty_time=penalty_time + #{time} " + // 去掉逗号
            "WHERE name = #{name} AND competition_id =#{cid}")
    void updatePenaltyTime(String name,long cid,int time);

    @Select("SELECT COUNT(*) FROM  competition_users WHERE competition_id=#{cid} AND user_id=#{uid}")
    int JudgeIsExist(long cid,long uid);

    @Insert("INSERT INTO competition_users(competition_id,user_id,name) VALUES(#{cid}, #{uid},#{name})")
    void createRecord(long cid,long uid,String name);
}
