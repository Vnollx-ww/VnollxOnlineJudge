package com.example.vnollxonlinejudge.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 用户上下文持有者
 * 使用ThreadLocal存储当前线程的用户信息
 * 避免在方法间传递用户ID参数
 * 
 * 注意：使用ThreadLocal时需要注意内存泄漏问题
 * 1. 必须在请求处理完成后清理ThreadLocal
 * 2. 异步处理时需要手动传递用户信息
 * 3. 线程池复用可能导致数据残留
 */
public class UserContextHolder {
    
    private static final Logger logger = LoggerFactory.getLogger(UserContextHolder.class);
    
    private static final ThreadLocal<Long> USER_ID_HOLDER = new ThreadLocal<>();
    private static final ThreadLocal<String> USER_IDENTITY_HOLDER = new ThreadLocal<>();
    
    /**
     * 设置当前用户ID
     * @param userId 用户ID
     */
    public static void setCurrentUserId(Long userId) {
        if (userId == null) {
            logger.warn("尝试设置空的用户ID");
            return;
        }
        USER_ID_HOLDER.set(userId);
        logger.debug("设置当前用户ID: {}", userId);
    }
    
    /**
     * 获取当前用户ID
     * @return 用户ID，如果未设置则返回null
     */
    public static Long getCurrentUserId() {
        Long userId = USER_ID_HOLDER.get();
        if (userId == null) {
            logger.debug("当前线程未设置用户ID");
        }
        return userId;
    }
    
    /**
     * 设置当前用户身份
     * @param identity 用户身份
     */
    public static void setCurrentUserIdentity(String identity) {
        if (identity == null || identity.trim().isEmpty()) {
            logger.warn("尝试设置空的用户身份");
            return;
        }
        USER_IDENTITY_HOLDER.set(identity);
        logger.debug("设置当前用户身份: {}", identity);
    }
    
    /**
     * 获取当前用户身份
     * @return 用户身份，如果未设置则返回null
     */
    public static String getCurrentUserIdentity() {
        String identity = USER_IDENTITY_HOLDER.get();
        if (identity == null) {
            logger.debug("当前线程未设置用户身份");
        }
        return identity;
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
     * 检查当前用户是否已登录
     * @return 是否已登录
     */
    public static boolean isLoggedIn() {
        return getCurrentUserId() != null;
    }
    
    /**
     * 获取当前用户信息摘要（用于日志记录）
     * @return 用户信息摘要
     */
    public static String getUserSummary() {
        Long userId = getCurrentUserId();
        String identity = getCurrentUserIdentity();
        return String.format("用户ID: %s, 身份: %s", userId, identity);
    }
    
    /**
     * 清理ThreadLocal，避免内存泄漏
     * 注意：此方法必须在请求处理完成后调用
     */
    public static void clear() {
        try {
            Long userId = USER_ID_HOLDER.get();
            String identity = USER_IDENTITY_HOLDER.get();
            
            USER_ID_HOLDER.remove();
            USER_IDENTITY_HOLDER.remove();
            
            if (userId != null || identity != null) {
                logger.debug("清理用户上下文: 用户ID={}, 身份={}", userId, identity);
            }
        } catch (Exception e) {
            logger.error("清理UserContextHolder时发生异常", e);
        }
    }
    
    /**
     * 安全地执行需要用户上下文的操作
     * 确保在操作完成后清理ThreadLocal
     * 
     * @param userId 用户ID
     * @param identity 用户身份
     * @param operation 需要执行的操作
     * @param <T> 返回值类型
     * @return 操作结果
     */
    public static <T> T executeWithContext(Long userId, String identity, ContextOperation<T> operation) {
        try {
            setCurrentUserId(userId);
            setCurrentUserIdentity(identity);
            return operation.execute();
        } finally {
            clear();
        }
    }
    
    /**
     * 上下文操作接口
     */
    @FunctionalInterface
    public interface ContextOperation<T> {
        T execute();
    }
}
