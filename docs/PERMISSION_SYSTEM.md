# 权限系统使用说明

## 概述

本项目实现了基于RBAC（Role-Based Access Control）的权限管理系统，支持：
- 角色管理
- 权限管理
- 用户-角色关联
- 角色-权限关联
- Redis缓存加速权限验证

## 数据库表结构

### 1. 角色表 (role)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| code | VARCHAR(50) | 角色码（唯一） |
| name | VARCHAR(100) | 角色名称 |
| description | VARCHAR(255) | 角色描述 |
| status | TINYINT | 状态：1-启用，0-禁用 |
| create_time | DATETIME | 创建时间 |
| update_time | DATETIME | 更新时间 |

### 2. 权限表 (permission)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| code | VARCHAR(100) | 权限码（唯一） |
| name | VARCHAR(100) | 权限名称 |
| description | VARCHAR(255) | 权限描述 |
| module | VARCHAR(50) | 所属模块 |
| status | TINYINT | 状态：1-启用，0-禁用 |
| create_time | DATETIME | 创建时间 |
| update_time | DATETIME | 更新时间 |

### 3. 角色-权限关联表 (role_permission)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| role_id | BIGINT | 角色ID |
| permission_id | BIGINT | 权限ID |
| create_time | DATETIME | 创建时间 |

### 4. 用户-角色关联表 (user_role)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| user_id | BIGINT | 用户ID |
| role_id | BIGINT | 角色ID |
| create_time | DATETIME | 创建时间 |

## 初始化

执行SQL脚本初始化权限数据：
```bash
# 在MySQL中执行
source src/main/resources/sql/permission_init.sql
```

## 预置角色

| 角色码 | 角色名称 | 说明 |
|--------|----------|------|
| SUPER_ADMIN | 超级管理员 | 拥有所有权限 |
| ADMIN | 管理员 | 拥有大部分管理权限 |
| USER | 普通用户 | 拥有基本使用权限 |
| GUEST | 游客 | 只有查看权限 |

## 权限码命名规范

权限码采用 `模块:操作` 的命名格式，例如：
- `user:view` - 查看用户
- `user:create` - 创建用户
- `problem:delete` - 删除题目

所有权限码定义在 `PermissionCode.java` 常量类中。

## 使用方式

### 1. 在Controller方法上添加权限注解

```java
import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;

@RestController
@RequestMapping("/admin/user")
public class AdminUserController {

    // 需要 user:view 权限
    @GetMapping("/list")
    @RequirePermission(PermissionCode.USER_VIEW)
    public Result<List<UserVo>> getUserList() {
        // ...
    }

    // 需要 user:create 权限
    @PostMapping("/add")
    @RequirePermission(PermissionCode.USER_CREATE)
    public Result<Void> createUser() {
        // ...
    }
}
```

### 2. 需要多个权限（OR逻辑，任一权限即可）

```java
@RequirePermission({PermissionCode.USER_VIEW, PermissionCode.USER_MANAGE})
public Result<Void> someMethod() {
    // 拥有 user:view 或 user:manage 任一权限即可访问
}
```

### 3. 需要多个权限（AND逻辑，需要全部权限）

```java
@RequirePermission(value = {PermissionCode.USER_VIEW, PermissionCode.USER_UPDATE}, 
                   logical = RequirePermission.Logical.AND)
public Result<Void> someMethod() {
    // 必须同时拥有 user:view 和 user:update 权限
}
```

### 4. 基于角色的权限控制

```java
import com.example.vnollxonlinejudge.annotation.RequireRole;
import com.example.vnollxonlinejudge.model.base.RoleCode;

@RequireRole(RoleCode.SUPER_ADMIN)
public Result<Void> superAdminOnly() {
    // 只有超级管理员可访问
}

@RequireRole({RoleCode.SUPER_ADMIN, RoleCode.ADMIN})
public Result<Void> adminOnly() {
    // 超级管理员或管理员可访问
}
```

### 5. 在Service层编程式校验权限

```java
@Autowired
private PermissionService permissionService;

public void someBusinessLogic(Long userId) {
    // 检查单个权限
    if (permissionService.hasPermission(userId, PermissionCode.USER_DELETE)) {
        // 有权限
    }
    
    // 检查任一权限
    if (permissionService.hasAnyPermission(userId, 
            PermissionCode.USER_VIEW, PermissionCode.USER_MANAGE)) {
        // 有任一权限
    }
    
    // 检查全部权限
    if (permissionService.hasAllPermissions(userId, 
            PermissionCode.USER_VIEW, PermissionCode.USER_UPDATE)) {
        // 有全部权限
    }
}
```

## Redis缓存

权限数据会自动缓存到Redis，缓存键格式：
- `user:permissions:{userId}` - 用户权限码集合
- `user:roles:{userId}` - 用户角色列表

缓存过期时间：1小时

### 手动刷新缓存

```java
@Autowired
private PermissionService permissionService;

// 刷新单个用户的权限缓存
permissionService.refreshUserPermissionCache(userId);

// 清除单个用户的权限缓存
permissionService.clearUserPermissionCache(userId);

// 清除所有权限缓存
permissionService.clearAllPermissionCache();
```

## 权限管理API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/admin/permission/roles` | GET | 获取所有角色 |
| `/admin/permission/permissions` | GET | 获取所有权限 |
| `/admin/permission/my/permissions` | GET | 获取当前用户权限 |
| `/admin/permission/my/roles` | GET | 获取当前用户角色 |
| `/admin/permission/user/{userId}/role/{roleId}` | POST | 给用户分配角色 |
| `/admin/permission/user/{userId}/role/{roleId}` | DELETE | 移除用户角色 |
| `/admin/permission/role/{roleId}/permission/{permissionId}` | POST | 给角色分配权限 |
| `/admin/permission/role/{roleId}/permission/{permissionId}` | DELETE | 移除角色权限 |
| `/admin/permission/user/{userId}/refresh` | POST | 刷新用户权限缓存 |
| `/admin/permission/cache/clear` | POST | 清除所有权限缓存 |

## 权限模块划分

| 模块 | 权限码前缀 | 说明 |
|------|------------|------|
| user | user:* | 用户管理 |
| problem | problem:* | 题目管理 |
| competition | competition:* | 比赛管理 |
| practice | practice:* | 练习管理 |
| submission | submission:* | 提交记录 |
| solve | solve:* | 题解管理 |
| tag | tag:* | 标签管理 |
| notification | notification:* | 通知管理 |
| ai | ai:* | AI配置 |
| system | system:* | 系统管理 |
| role | role:* | 角色权限管理 |

## 注意事项

1. **缓存一致性**：修改用户角色或角色权限后，需要刷新相关用户的权限缓存
2. **权限继承**：本系统不支持权限继承，每个角色的权限需要显式配置
3. **超级管理员**：SUPER_ADMIN 角色默认拥有所有权限
4. **迁移兼容**：SQL脚本会自动根据用户表的 `identity` 字段迁移用户角色
