package com.example.vnollxonlinejudge.exception;

/**
 * 题目相关异常
 */
public class ProblemException extends BusinessException {
    
    public ProblemException(String message) {
        super(message);
    }
    
    public ProblemException(String message, Throwable cause) {
        super(message, cause);
    }
    
    /**
     * 题目不存在异常
     */
    public static class ProblemNotFoundException extends ProblemException {
        public ProblemNotFoundException(Long problemId) {
            super("题目不存在，ID: " + problemId);
        }
    }
    
    /**
     * 题目已存在异常
     */
    public static class ProblemAlreadyExistsException extends ProblemException {
        public ProblemAlreadyExistsException(String title) {
            super("题目已存在，标题: " + title);
        }
    }
    
    /**
     * 题目测试用例不存在异常
     */
    public static class TestCaseNotFoundException extends ProblemException {
        public TestCaseNotFoundException(Long problemId) {
            super("题目测试用例不存在，题目ID: " + problemId);
        }
    }
    
    /**
     * 题目权限不足异常
     */
    public static class ProblemAccessDeniedException extends ProblemException {
        public ProblemAccessDeniedException(Long problemId) {
            super("无权限访问题目，ID: " + problemId);
        }
    }
}
