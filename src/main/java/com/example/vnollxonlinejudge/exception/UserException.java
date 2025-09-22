package com.example.vnollxonlinejudge.exception;

/**
 * 用户相关异常
 */
public class UserException extends BusinessException {
    
    public UserException(String message) {
        super(message);
    }
    
    public UserException(String message, Throwable cause) {
        super(message, cause);
    }
    
    /**
     * 用户不存在异常
     */
    public static class UserNotFoundException extends UserException {
        public UserNotFoundException(Long userId) {
            super("用户不存在，ID: " + userId);
        }
        
        public UserNotFoundException(String email) {
            super("用户不存在，邮箱: " + email);
        }
    }
    
    /**
     * 用户已存在异常
     */
    public static class UserAlreadyExistsException extends UserException {
        public UserAlreadyExistsException(String email) {
            super("用户已存在，邮箱: " + email);
        }
        
        public UserAlreadyExistsException(String field, String value) {
            super("用户已存在，" + field + ": " + value);
        }
    }
    
    /**
     * 密码错误异常
     */
    public static class InvalidPasswordException extends UserException {
        public InvalidPasswordException() {
            super("密码错误");
        }
    }
    
    /**
     * 邮箱验证失败异常
     */
    public static class EmailVerificationException extends UserException {
        public EmailVerificationException(String message) {
            super("邮箱验证失败: " + message);
        }
    }
    
    /**
     * 用户被禁用异常
     */
    public static class UserDisabledException extends UserException {
        public UserDisabledException(Long userId) {
            super("用户已被禁用，ID: " + userId);
        }
    }
}
