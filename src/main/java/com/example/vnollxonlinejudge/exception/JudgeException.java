package com.example.vnollxonlinejudge.exception;

/**
 * 评测系统相关异常
 */
public class JudgeException extends BusinessException {
    
    public JudgeException(String message) {
        super(message);
    }
    
    public JudgeException(String message, Throwable cause) {
        super(message, cause);
    }
    
    /**
     * 评测超时异常
     */
    public static class TimeoutException extends JudgeException {
        public TimeoutException(String message) {
            super("评测超时: " + message);
        }
    }
    
    /**
     * 评测内存溢出异常
     */
    public static class MemoryLimitExceededException extends JudgeException {
        public MemoryLimitExceededException(String message) {
            super("内存限制超出: " + message);
        }
    }
    
    /**
     * 评测系统不可用异常
     */
    public static class JudgeSystemUnavailableException extends JudgeException {
        public JudgeSystemUnavailableException(String message) {
            super("评测系统不可用: " + message);
        }
    }
    
    /**
     * 不支持的编程语言异常
     */
    public static class UnsupportedLanguageException extends JudgeException {
        public UnsupportedLanguageException(String language) {
            super("不支持的编程语言: " + language);
        }
    }
}
