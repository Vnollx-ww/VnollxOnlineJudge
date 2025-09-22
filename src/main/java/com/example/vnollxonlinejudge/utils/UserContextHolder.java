package com.example.vnollxonlinejudge.utils;

/**
 * 用户上下文持有者
 * 使用ThreadLocal存储当前线程的用户信息
 * 避免在方法间传递用户ID参数
 */
public class UserContextHolder {
    
    private static final ThreadLocal<Long> USER_ID_HOLDER = new ThreadLocal<>();
    private static final ThreadLocal<String> USER_IDENTITY_HOLDER = new ThreadLocal<>();
    
    /**
     * 设置当前用户ID
     * @param userId 用户ID
     */
    public static void setCurrentUserId(Long userId) {
        USER_ID_HOLDER.set(userId);
    }
    
    /**
     * 获取当前用户ID
     * @return 用户ID
     */
    public static Long getCurrentUserId() {
        return USER_ID_HOLDER.get();
    }
    
    /**
     * 设置当前用户身份
     * @param identity 用户身份
     */
    public static void setCurrentUserIdentity(String identity) {
        USER_IDENTITY_HOLDER.set(identity);
    }
    
    /**
     * 获取当前用户身份
     * @return 用户身份
     */
    public static String getCurrentUserIdentity() {
        return USER_IDENTITY_HOLDER.get();
    }
    
    /**
     * 检查当前用户是否为管理员
     * @return 是否为管理员
     */
    public static boolean isAdmin() {
        String identity = getCurrentUserIdentity();
        return "ADMIN".equals(identity) || "SUPER_ADMIN".equals(identity);
    }
    
    /**
     * 检查当前用户是否为超级管理员
     * @return 是否为超级管理员
     */
    public static boolean isSuperAdmin() {
        String identity = getCurrentUserIdentity();
        return "SUPER_ADMIN".equals(identity);
    }
    
    /**
     * 清理ThreadLocal，避免内存泄漏
     */
    public static void clear() {
        USER_ID_HOLDER.remove();
        USER_IDENTITY_HOLDER.remove();
    }
}
