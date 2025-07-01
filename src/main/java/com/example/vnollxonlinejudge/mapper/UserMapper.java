package com.example.vnollxonlinejudge.mapper;

import com.example.vnollxonlinejudge.domain.User;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface UserMapper {
    @Insert("INSERT INTO users(name, password,email,submit_count,pass_count) VALUES(#{name}, #{password},#{email},0,0)")
    void insertUser(String name,String password,String email);
    @Select("SELECT * FROM users WHERE id = #{id}")
    User getUserById(long id);
    @Select("SELECT * FROM users WHERE email = #{email}")
    User getUserByEmail(String email);
    @Select("SELECT * FROM users WHERE name = #{name}")
    User getUserByName(String name);
    @Update("UPDATE users SET submit_count=submit_count+1,pass_count = pass_count + #{ok}  WHERE id = #{uid}")
    void updateSubmitCount(long uid,int ok);
    @Select("SELECT * FROM users")
    List<User> getAllUser();
    @Update("UPDATE users SET password = #{password} WHERE id = #{uid}")
    void updatePassword(String password,long uid);

    @Update("UPDATE users SET email = #{email}, name = #{name} WHERE id = #{uid}")
    void updateUserInfo(String email,  String name,long uid);
}
