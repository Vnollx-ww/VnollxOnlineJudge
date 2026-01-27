package com.example.vnollxonlinejudge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.vnollxonlinejudge.model.entity.Permission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Set;

@Mapper
public interface PermissionMapper extends BaseMapper<Permission> {
    
    @Select("SELECT p.* FROM permission p " +
            "INNER JOIN role_permission rp ON p.id = rp.permission_id " +
            "WHERE rp.role_id = #{roleId} AND p.status = 1")
    List<Permission> selectPermissionsByRoleId(@Param("roleId") Long roleId);
    
    @Select("<script>" +
            "SELECT DISTINCT p.code FROM permission p " +
            "INNER JOIN role_permission rp ON p.id = rp.permission_id " +
            "WHERE rp.role_id IN " +
            "<foreach collection='roleIds' item='roleId' open='(' separator=',' close=')'>" +
            "#{roleId}" +
            "</foreach> " +
            "AND p.status = 1" +
            "</script>")
    Set<String> selectPermissionCodesByRoleIds(@Param("roleIds") List<Long> roleIds);
    
    @Select("SELECT * FROM permission WHERE code = #{code} AND status = 1")
    Permission selectByCode(@Param("code") String code);
    
    @Select("SELECT * FROM permission WHERE module = #{module} AND status = 1")
    List<Permission> selectByModule(@Param("module") String module);
}
