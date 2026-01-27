package com.example.vnollxonlinejudge.model.base;

/**
 * 权限码常量定义
 * 命名规则：模块:操作
 */
public class PermissionCode {
    
    // ==================== 用户管理权限 ====================
    public static final String USER_VIEW = "user:view";
    public static final String USER_CREATE = "user:create";
    public static final String USER_UPDATE = "user:update";
    public static final String USER_DELETE = "user:delete";
    public static final String USER_MANAGE = "user:manage";
    
    // ==================== 题目管理权限 ====================
    public static final String PROBLEM_VIEW = "problem:view";
    public static final String PROBLEM_CREATE = "problem:create";
    public static final String PROBLEM_UPDATE = "problem:update";
    public static final String PROBLEM_DELETE = "problem:delete";
    public static final String PROBLEM_MANAGE = "problem:manage";
    
    // ==================== 比赛管理权限 ====================
    public static final String COMPETITION_VIEW = "competition:view";
    public static final String COMPETITION_CREATE = "competition:create";
    public static final String COMPETITION_UPDATE = "competition:update";
    public static final String COMPETITION_DELETE = "competition:delete";
    public static final String COMPETITION_MANAGE = "competition:manage";
    
    // ==================== 练习管理权限 ====================
    public static final String PRACTICE_VIEW = "practice:view";
    public static final String PRACTICE_CREATE = "practice:create";
    public static final String PRACTICE_UPDATE = "practice:update";
    public static final String PRACTICE_DELETE = "practice:delete";
    public static final String PRACTICE_MANAGE = "practice:manage";
    
    // ==================== 提交记录权限 ====================
    public static final String SUBMISSION_VIEW = "submission:view";
    public static final String SUBMISSION_VIEW_ALL = "submission:view_all";
    public static final String SUBMISSION_REJUDGE = "submission:rejudge";
    public static final String SUBMISSION_SUBMIT = "submission:submit";
    
    // ==================== 题解管理权限 ====================
    public static final String SOLVE_VIEW = "solve:view";
    public static final String SOLVE_CREATE = "solve:create";
    public static final String SOLVE_UPDATE = "solve:update";
    public static final String SOLVE_DELETE = "solve:delete";
    public static final String SOLVE_AUDIT = "solve:audit";
    
    // ==================== 标签管理权限 ====================
    public static final String TAG_VIEW = "tag:view";
    public static final String TAG_CREATE = "tag:create";
    public static final String TAG_UPDATE = "tag:update";
    public static final String TAG_DELETE = "tag:delete";
    
    // ==================== 通知管理权限 ====================
    public static final String NOTIFICATION_VIEW = "notification:view";
    public static final String NOTIFICATION_CREATE = "notification:create";
    public static final String NOTIFICATION_DELETE = "notification:delete";
    
    // ==================== 社交功能权限 ====================
    public static final String FRIEND_USE = "friend:use";
    public static final String COMMENT_CREATE = "comment:create";
    public static final String COMMENT_DELETE = "comment:delete";
    
    // ==================== AI配置权限 ====================
    public static final String AI_CONFIG_VIEW = "ai:config_view";
    public static final String AI_CONFIG_UPDATE = "ai:config_update";
    public static final String AI_CHAT = "ai:chat";
    
    // ==================== 系统管理权限 ====================
    public static final String SYSTEM_SETTINGS = "system:settings";
    public static final String SYSTEM_MONITOR = "system:monitor";
    public static final String SYSTEM_LOG = "system:log";
    
    // ==================== 角色权限管理 ====================
    public static final String ROLE_VIEW = "role:view";
    public static final String ROLE_CREATE = "role:create";
    public static final String ROLE_UPDATE = "role:update";
    public static final String ROLE_DELETE = "role:delete";
    public static final String PERMISSION_ASSIGN = "permission:assign";
    
    private PermissionCode() {}
}
