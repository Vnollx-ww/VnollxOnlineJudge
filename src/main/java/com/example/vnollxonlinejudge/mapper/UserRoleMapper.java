package com.example.vnollxonlinejudge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.vnollxonlinejudge.model.entity.UserRole;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface UserRoleMapper extends BaseMapper<UserRole> {
    
    @Select("SELECT role_id FROM user_role WHERE user_id = #{userId}")
    List<Long> selectRoleIdsByUserId(@Param("userId") Long userId);
    
    @Select("SELECT user_id FROM user_role WHERE role_id = #{roleId}")
    List<Long> selectUserIdsByRoleId(@Param("roleId") Long roleId);
    
    @Delete("DELETE FROM user_role WHERE user_id = #{userId}")
    int deleteByUserId(@Param("userId") Long userId);
    
    @Delete("DELETE FROM user_role WHERE role_id = #{roleId}")
    int deleteByRoleId(@Param("roleId") Long roleId);
}
