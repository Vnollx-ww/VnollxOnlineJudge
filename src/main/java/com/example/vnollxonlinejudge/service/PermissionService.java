package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.Permission;
import com.example.vnollxonlinejudge.model.entity.Role;

import java.util.List;
import java.util.Set;

/**
 * 权限服务接口
 */
public interface PermissionService {
    
    /**
     * 获取用户的所有权限码
     */
    Set<String> getUserPermissionCodes(Long userId);
    
    /**
     * 检查用户是否拥有指定权限
     */
    boolean hasPermission(Long userId, String permissionCode);
    
    /**
     * 检查用户是否拥有任一权限
     */
    boolean hasAnyPermission(Long userId, String... permissionCodes);
    
    /**
     * 检查用户是否拥有所有权限
     */
    boolean hasAllPermissions(Long userId, String... permissionCodes);
    
    /**
     * 获取用户的所有角色
     */
    List<Role> getUserRoles(Long userId);
    
    /**
     * 获取角色的所有权限
     */
    List<Permission> getRolePermissions(Long roleId);
    
    /**
     * 刷新用户权限缓存
     */
    void refreshUserPermissionCache(Long userId);
    
    /**
     * 清除用户权限缓存
     */
    void clearUserPermissionCache(Long userId);
    
    /**
     * 清除所有权限缓存
     */
    void clearAllPermissionCache();
    
    /**
     * 给用户分配角色
     */
    void assignRoleToUser(Long userId, Long roleId);
    
    /**
     * 移除用户角色
     */
    void removeRoleFromUser(Long userId, Long roleId);
    
    /**
     * 给角色分配权限
     */
    void assignPermissionToRole(Long roleId, Long permissionId);
    
    /**
     * 移除角色权限
     */
    void removePermissionFromRole(Long roleId, Long permissionId);
    
    /**
     * 获取所有角色
     */
    List<Role> getAllRoles();
    
    /**
     * 获取所有权限
     */
    List<Permission> getAllPermissions();
    
    /**
     * 根据模块获取权限
     */
    List<Permission> getPermissionsByModule(String module);
}
