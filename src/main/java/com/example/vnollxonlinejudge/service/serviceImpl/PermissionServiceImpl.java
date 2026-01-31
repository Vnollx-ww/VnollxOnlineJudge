package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.PermissionMapper;
import com.example.vnollxonlinejudge.mapper.RoleMapper;
import com.example.vnollxonlinejudge.mapper.RolePermissionMapper;
import com.example.vnollxonlinejudge.mapper.UserRoleMapper;
import com.example.vnollxonlinejudge.model.base.RedisKeyType;
import com.example.vnollxonlinejudge.model.entity.Permission;
import com.example.vnollxonlinejudge.model.entity.Role;
import com.example.vnollxonlinejudge.model.entity.RolePermission;
import com.example.vnollxonlinejudge.model.entity.UserRole;
import com.example.vnollxonlinejudge.service.PermissionService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * 权限服务实现类
 */
@Service
public class PermissionServiceImpl implements PermissionService {
    
    private static final Logger logger = LoggerFactory.getLogger(PermissionServiceImpl.class);
    
    private static final String PERMISSION_CACHE_PREFIX = "user:permissions:";
    private static final String ROLE_CACHE_PREFIX = "user:roles:";
    private static final long CACHE_EXPIRE_SECONDS = 3600L; // 1小时
    
    private final UserRoleMapper userRoleMapper;
    private final RoleMapper roleMapper;
    private final PermissionMapper permissionMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;
    
    @Autowired
    public PermissionServiceImpl(UserRoleMapper userRoleMapper,
                                  RoleMapper roleMapper,
                                  PermissionMapper permissionMapper,
                                  RolePermissionMapper rolePermissionMapper,
                                  StringRedisTemplate stringRedisTemplate,
                                  ObjectMapper objectMapper) {
        this.userRoleMapper = userRoleMapper;
        this.roleMapper = roleMapper;
        this.permissionMapper = permissionMapper;
        this.rolePermissionMapper = rolePermissionMapper;
        this.stringRedisTemplate = stringRedisTemplate;
        this.objectMapper = objectMapper;
    }
    
    @Override
    public Set<String> getUserPermissionCodes(Long userId) {
        if (userId == null) {
            return Collections.emptySet();
        }
        
        String cacheKey = PERMISSION_CACHE_PREFIX + userId;
        
        try {
            // 先从缓存获取
            String cachedPermissions = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cachedPermissions != null && !cachedPermissions.isEmpty()) {
                return objectMapper.readValue(cachedPermissions, new TypeReference<Set<String>>() {});
            }
        } catch (Exception e) {
            logger.warn("从Redis获取权限缓存失败: userId={}", userId, e);
        }
        
        // 缓存未命中，从数据库查询
        Set<String> permissions = loadUserPermissionsFromDB(userId);
        
        // 存入缓存
        try {
            String json = objectMapper.writeValueAsString(permissions);
            stringRedisTemplate.opsForValue().set(cacheKey, json, CACHE_EXPIRE_SECONDS, TimeUnit.SECONDS);
        } catch (JsonProcessingException e) {
            logger.warn("权限缓存序列化失败: userId={}", userId, e);
        }
        
        return permissions;
    }
    
    private Set<String> loadUserPermissionsFromDB(Long userId) {
        // 获取用户角色ID列表
        List<Long> roleIds = userRoleMapper.selectRoleIdsByUserId(userId);
        if (roleIds == null || roleIds.isEmpty()) {
            return Collections.emptySet();
        }
        
        // 获取角色对应的权限码
        return permissionMapper.selectPermissionCodesByRoleIds(roleIds);
    }
    
    @Override
    public boolean hasPermission(Long userId, String permissionCode) {
        if (userId == null || permissionCode == null || permissionCode.isEmpty()) {
            return false;
        }
        Set<String> permissions = getUserPermissionCodes(userId);
        return permissions.contains(permissionCode);
    }
    
    @Override
    public boolean hasAnyPermission(Long userId, String... permissionCodes) {
        if (userId == null || permissionCodes == null || permissionCodes.length == 0) {
            return false;
        }
        Set<String> permissions = getUserPermissionCodes(userId);
        for (String code : permissionCodes) {
            if (permissions.contains(code)) {
                return true;
            }
        }
        return false;
    }
    
    @Override
    public boolean hasAllPermissions(Long userId, String... permissionCodes) {
        if (userId == null || permissionCodes == null || permissionCodes.length == 0) {
            return false;
        }
        Set<String> permissions = getUserPermissionCodes(userId);
        for (String code : permissionCodes) {
            if (!permissions.contains(code)) {
                return false;
            }
        }
        return true;
    }
    
    @Override
    public List<Role> getUserRoles(Long userId) {
        if (userId == null) {
            return Collections.emptyList();
        }
        
        String cacheKey = ROLE_CACHE_PREFIX + userId;
        
        try {
            String cachedRoles = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cachedRoles != null && !cachedRoles.isEmpty()) {
                return objectMapper.readValue(cachedRoles, new TypeReference<List<Role>>() {});
            }
        } catch (Exception e) {
            logger.warn("从Redis获取角色缓存失败: userId={}", userId, e);
        }
        
        List<Role> roles = roleMapper.selectRolesByUserId(userId);
        
        try {
            String json = objectMapper.writeValueAsString(roles);
            stringRedisTemplate.opsForValue().set(cacheKey, json, CACHE_EXPIRE_SECONDS, TimeUnit.SECONDS);
        } catch (JsonProcessingException e) {
            logger.warn("角色缓存序列化失败: userId={}", userId, e);
        }
        
        return roles;
    }
    
    @Override
    public List<Permission> getRolePermissions(Long roleId) {
        if (roleId == null) {
            return Collections.emptyList();
        }
        return permissionMapper.selectPermissionsByRoleId(roleId);
    }
    
    @Override
    public void refreshUserPermissionCache(Long userId) {
        if (userId == null) {
            return;
        }
        clearUserPermissionCache(userId);
        // 重新加载到缓存
        getUserPermissionCodes(userId);
        getUserRoles(userId);
    }
    
    @Override
    public void clearUserPermissionCache(Long userId) {
        if (userId == null) {
            return;
        }
        try {
            stringRedisTemplate.delete(PERMISSION_CACHE_PREFIX + userId);
            stringRedisTemplate.delete(ROLE_CACHE_PREFIX + userId);
        } catch (Exception e) {
            logger.error("清除用户权限缓存失败: userId={}", userId, e);
        }
    }
    
    @Override
    public void clearAllPermissionCache() {
        try {
            Set<String> permKeys = stringRedisTemplate.keys(PERMISSION_CACHE_PREFIX + "*");
            Set<String> roleKeys = stringRedisTemplate.keys(ROLE_CACHE_PREFIX + "*");
            if (permKeys != null && !permKeys.isEmpty()) {
                stringRedisTemplate.delete(permKeys);
            }
            if (roleKeys != null && !roleKeys.isEmpty()) {
                stringRedisTemplate.delete(roleKeys);
            }
        } catch (Exception e) {
            logger.error("清除所有权限缓存失败", e);
        }
    }
    
    @Override
    @Transactional
    public void assignRoleToUser(Long userId, Long roleId) {
        if (userId == null || roleId == null) {
            throw new BusinessException("用户ID和角色ID不能为空");
        }
        
        // 检查是否已存在
        LambdaQueryWrapper<UserRole> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserRole::getUserId, userId).eq(UserRole::getRoleId, roleId);
        if (userRoleMapper.selectCount(wrapper) > 0) {
            return; // 已存在，不重复添加
        }
        
        UserRole userRole = UserRole.builder()
                .userId(userId)
                .roleId(roleId)
                .createTime(LocalDateTime.now())
                .build();
        userRoleMapper.insert(userRole);
        
        // 清除缓存并强制用户重新登录
        clearUserPermissionCache(userId);
        invalidateUserToken(userId);
    }
    
    @Override
    @Transactional
    public void removeRoleFromUser(Long userId, Long roleId) {
        if (userId == null || roleId == null) {
            throw new BusinessException("用户ID和角色ID不能为空");
        }
        
        LambdaQueryWrapper<UserRole> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserRole::getUserId, userId).eq(UserRole::getRoleId, roleId);
        userRoleMapper.delete(wrapper);
        
        // 清除缓存并强制用户重新登录
        clearUserPermissionCache(userId);
        invalidateUserToken(userId);
    }
    
    @Override
    @Transactional
    public void assignPermissionToRole(Long roleId, Long permissionId) {
        if (roleId == null || permissionId == null) {
            throw new BusinessException("角色ID和权限ID不能为空");
        }
        
        // 检查是否已存在
        LambdaQueryWrapper<RolePermission> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RolePermission::getRoleId, roleId).eq(RolePermission::getPermissionId, permissionId);
        if (rolePermissionMapper.selectCount(wrapper) > 0) {
            return;
        }
        
        RolePermission rolePermission = RolePermission.builder()
                .roleId(roleId)
                .permissionId(permissionId)
                .createTime(LocalDateTime.now())
                .build();
        rolePermissionMapper.insert(rolePermission);
        
        // 清除所有权限缓存并强制该角色的所有用户重新登录
        clearAllPermissionCache();
        invalidateUsersWithRole(roleId);
    }
    
    @Override
    @Transactional
    public void removePermissionFromRole(Long roleId, Long permissionId) {
        if (roleId == null || permissionId == null) {
            throw new BusinessException("角色ID和权限ID不能为空");
        }
        
        LambdaQueryWrapper<RolePermission> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RolePermission::getRoleId, roleId).eq(RolePermission::getPermissionId, permissionId);
        rolePermissionMapper.delete(wrapper);
        
        clearAllPermissionCache();
        invalidateUsersWithRole(roleId);
    }
    
    /**
     * 强制用户token失效，需要重新登录
     */
    private void invalidateUserToken(Long userId) {
        if (userId == null) {
            return;
        }
        try {
            String logoutKey = RedisKeyType.LOGOUT.generateKey(userId);
            stringRedisTemplate.opsForValue().set(logoutKey, "permission_changed", CACHE_EXPIRE_SECONDS, TimeUnit.SECONDS);
            logger.info("用户权限变更，强制重新登录: userId={}", userId);
        } catch (Exception e) {
            logger.error("设置用户登出标记失败: userId={}", userId, e);
        }
    }
    
    /**
     * 强制某角色的所有用户token失效
     */
    private void invalidateUsersWithRole(Long roleId) {
        if (roleId == null) {
            return;
        }
        try {
            List<Long> userIds = userRoleMapper.selectUserIdsByRoleId(roleId);
            if (userIds != null) {
                for (Long userId : userIds) {
                    invalidateUserToken(userId);
                }
            }
            logger.info("角色权限变更，强制{}个用户重新登录: roleId={}", userIds != null ? userIds.size() : 0, roleId);
        } catch (Exception e) {
            logger.error("获取角色用户列表失败: roleId={}", roleId, e);
        }
    }
    
    @Override
    public List<Role> getAllRoles() {
        LambdaQueryWrapper<Role> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Role::getStatus, 1);
        return roleMapper.selectList(wrapper);
    }
    
    @Override
    public List<Permission> getAllPermissions() {
        LambdaQueryWrapper<Permission> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Permission::getStatus, 1);
        return permissionMapper.selectList(wrapper);
    }
    
    @Override
    public List<Permission> getPermissionsByModule(String module) {
        if (module == null || module.isEmpty()) {
            return Collections.emptyList();
        }
        return permissionMapper.selectByModule(module);
    }
    
    @Override
    @Transactional
    public void syncUserRoleByIdentity(Long userId, String identityCode) {
        if (userId == null || identityCode == null || identityCode.isEmpty()) {
            return;
        }
        
        // 查找对应身份的角色
        Role role = roleMapper.selectByCode(identityCode);
        if (role == null) {
            logger.warn("未找到对应身份的角色: identityCode={}", identityCode);
            return;
        }
        
        // 清除用户现有的所有角色
        userRoleMapper.deleteByUserId(userId);
        
        // 分配新角色
        UserRole userRole = UserRole.builder()
                .userId(userId)
                .roleId(role.getId())
                .createTime(LocalDateTime.now())
                .build();
        userRoleMapper.insert(userRole);
        
        // 清除缓存并强制重新登录
        clearUserPermissionCache(userId);
        invalidateUserToken(userId);
        
        logger.info("用户角色同步成功: userId={}, roleCode={}", userId, identityCode);
    }
}
