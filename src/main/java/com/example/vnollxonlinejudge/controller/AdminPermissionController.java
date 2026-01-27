package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.example.vnollxonlinejudge.model.entity.Permission;
import com.example.vnollxonlinejudge.model.entity.Role;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.service.PermissionService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

/**
 * 权限管理控制器
 */
@RestController
@RequestMapping("/admin/permission")
@Validated
public class AdminPermissionController {
    
    private final PermissionService permissionService;
    
    @Autowired
    public AdminPermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }
    
    /**
     * 获取所有角色
     */
    @GetMapping("/roles")
    @RequirePermission(PermissionCode.ROLE_VIEW)
    public Result<List<Role>> getAllRoles() {
        List<Role> roles = permissionService.getAllRoles();
        return Result.Success(roles, "获取角色列表成功");
    }
    
    /**
     * 获取所有权限
     */
    @GetMapping("/permissions")
    @RequirePermission(PermissionCode.ROLE_VIEW)
    public Result<List<Permission>> getAllPermissions() {
        List<Permission> permissions = permissionService.getAllPermissions();
        return Result.Success(permissions, "获取权限列表成功");
    }
    
    /**
     * 根据模块获取权限
     */
    @GetMapping("/permissions/module/{module}")
    @RequirePermission(PermissionCode.ROLE_VIEW)
    public Result<List<Permission>> getPermissionsByModule(@PathVariable String module) {
        List<Permission> permissions = permissionService.getPermissionsByModule(module);
        return Result.Success(permissions, "获取模块权限成功");
    }
    
    /**
     * 获取用户的角色列表
     */
    @GetMapping("/user/{userId}/roles")
    @RequirePermission(PermissionCode.ROLE_VIEW)
    public Result<List<Role>> getUserRoles(@PathVariable Long userId) {
        List<Role> roles = permissionService.getUserRoles(userId);
        return Result.Success(roles, "获取用户角色成功");
    }
    
    /**
     * 获取用户的权限码列表
     */
    @GetMapping("/user/{userId}/permissions")
    @RequirePermission(PermissionCode.ROLE_VIEW)
    public Result<Set<String>> getUserPermissions(@PathVariable Long userId) {
        Set<String> permissions = permissionService.getUserPermissionCodes(userId);
        return Result.Success(permissions, "获取用户权限成功");
    }
    
    /**
     * 获取当前登录用户的权限
     */
    @GetMapping("/my/permissions")
    public Result<Set<String>> getMyPermissions() {
        Long userId = UserContextHolder.getCurrentUserId();
        Set<String> permissions = permissionService.getUserPermissionCodes(userId);
        return Result.Success(permissions, "获取当前用户权限成功");
    }
    
    /**
     * 获取当前登录用户的角色
     */
    @GetMapping("/my/roles")
    public Result<List<Role>> getMyRoles() {
        Long userId = UserContextHolder.getCurrentUserId();
        List<Role> roles = permissionService.getUserRoles(userId);
        return Result.Success(roles, "获取当前用户角色成功");
    }
    
    /**
     * 获取角色的权限列表
     */
    @GetMapping("/role/{roleId}/permissions")
    @RequirePermission(PermissionCode.ROLE_VIEW)
    public Result<List<Permission>> getRolePermissions(@PathVariable Long roleId) {
        List<Permission> permissions = permissionService.getRolePermissions(roleId);
        return Result.Success(permissions, "获取角色权限成功");
    }
    
    /**
     * 给用户分配角色
     */
    @PostMapping("/user/{userId}/role/{roleId}")
    @RequirePermission(PermissionCode.PERMISSION_ASSIGN)
    public Result<Void> assignRoleToUser(@PathVariable Long userId, @PathVariable Long roleId) {
        permissionService.assignRoleToUser(userId, roleId);
        return Result.Success("分配角色成功");
    }
    
    /**
     * 移除用户角色
     */
    @DeleteMapping("/user/{userId}/role/{roleId}")
    @RequirePermission(PermissionCode.PERMISSION_ASSIGN)
    public Result<Void> removeRoleFromUser(@PathVariable Long userId, @PathVariable Long roleId) {
        permissionService.removeRoleFromUser(userId, roleId);
        return Result.Success("移除角色成功");
    }
    
    /**
     * 给角色分配权限
     */
    @PostMapping("/role/{roleId}/permission/{permissionId}")
    @RequirePermission(PermissionCode.PERMISSION_ASSIGN)
    public Result<Void> assignPermissionToRole(@PathVariable Long roleId, @PathVariable Long permissionId) {
        permissionService.assignPermissionToRole(roleId, permissionId);
        return Result.Success("分配权限成功");
    }
    
    /**
     * 移除角色权限
     */
    @DeleteMapping("/role/{roleId}/permission/{permissionId}")
    @RequirePermission(PermissionCode.PERMISSION_ASSIGN)
    public Result<Void> removePermissionFromRole(@PathVariable Long roleId, @PathVariable Long permissionId) {
        permissionService.removePermissionFromRole(roleId, permissionId);
        return Result.Success("移除权限成功");
    }
    
    /**
     * 刷新用户权限缓存
     */
    @PostMapping("/user/{userId}/refresh")
    @RequirePermission(PermissionCode.PERMISSION_ASSIGN)
    public Result<Void> refreshUserPermissionCache(@PathVariable Long userId) {
        permissionService.refreshUserPermissionCache(userId);
        return Result.Success("刷新权限缓存成功");
    }
    
    /**
     * 清除所有权限缓存
     */
    @PostMapping("/cache/clear")
    @RequirePermission(PermissionCode.SYSTEM_SETTINGS)
    public Result<Void> clearAllPermissionCache() {
        permissionService.clearAllPermissionCache();
        return Result.Success("清除所有权限缓存成功");
    }
}
