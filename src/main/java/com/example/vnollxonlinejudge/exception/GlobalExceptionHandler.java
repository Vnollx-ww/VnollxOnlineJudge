package com.example.vnollxonlinejudge.exception;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.stream.Collectors;

/**
 * 全局异常处理器
 * 统一处理系统中的各种异常，提供友好的错误信息
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    
    /**
     * 处理权限不足异常
     */
    @ExceptionHandler(PermissionDeniedException.class)
    public Result<Void> handlePermissionDeniedException(PermissionDeniedException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        logger.warn("权限不足异常 - 用户: {}, 请求: {} {}, 错误: {}", 
                   userInfo, request.getMethod(), request.getRequestURI(), e.getMessage());
        return Result.AuthenticationError(e.getMessage());
    }
    
    /**
     * 处理业务逻辑异常
     */
    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusinessException(BusinessException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        logger.warn("业务逻辑异常 - 用户: {}, 请求: {} {}, 错误: {}", 
                   userInfo, request.getMethod(), request.getRequestURI(), e.getMessage());
        return Result.LogicError(e.getMessage());
    }

    
    /**
     * 处理参数验证异常
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValidationException(MethodArgumentNotValidException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        String errorMessage = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        
        logger.warn("参数验证失败 - 用户: {}, 请求: {} {}, 错误: {}", 
                   userInfo, request.getMethod(), request.getRequestURI(), errorMessage);
        return Result.LogicError("参数验证失败: " + errorMessage);
    }
    
    /**
     * 处理绑定异常
     */
    @ExceptionHandler(BindException.class)
    public Result<Void> handleBindException(BindException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        String errorMessage = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        
        logger.warn("数据绑定失败 - 用户: {}, 请求: {} {}, 错误: {}", 
                   userInfo, request.getMethod(), request.getRequestURI(), errorMessage);
        return Result.LogicError("数据绑定失败: " + errorMessage);
    }
    
    /**
     * 处理约束违反异常
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public Result<Void> handleConstraintViolationException(ConstraintViolationException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        String errorMessage = e.getConstraintViolations().stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .collect(Collectors.joining(", "));
        
        logger.warn("约束违反 - 用户: {}, 请求: {} {}, 错误: {}", 
                   userInfo, request.getMethod(), request.getRequestURI(), errorMessage);
        return Result.LogicError("参数约束违反: " + errorMessage);
    }
    
    /**
     * 处理缺少请求参数异常
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public Result<Void> handleMissingParameterException(MissingServletRequestParameterException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        String errorMessage = String.format("缺少必需参数: %s (类型: %s)", e.getParameterName(), e.getParameterType());
        
        logger.warn("缺少请求参数 - 用户: {}, 请求: {} {}, 错误: {}", 
                   userInfo, request.getMethod(), request.getRequestURI(), errorMessage);
        return Result.LogicError(errorMessage);
    }
    
    /**
     * 处理参数类型不匹配异常
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public Result<Void> handleTypeMismatchException(MethodArgumentTypeMismatchException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        String errorMessage = String.format("参数类型不匹配: %s，期望类型: %s，实际值: %s", 
                                           e.getName(), e.getRequiredType().getSimpleName(), e.getValue());
        
        logger.warn("参数类型不匹配 - 用户: {}, 请求: {} {}, 错误: {}", 
                   userInfo, request.getMethod(), request.getRequestURI(), errorMessage);
        return Result.LogicError(errorMessage);
    }
    
    /**
     * 处理HTTP消息不可读异常
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public Result<Void> handleHttpMessageNotReadableException(HttpMessageNotReadableException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        logger.warn("HTTP消息不可读 - 用户: {}, 请求: {} {}, 错误: {}", 
                   userInfo, request.getMethod(), request.getRequestURI(), e.getMessage());
        return Result.LogicError("请求体格式错误，请检查JSON格式");
    }
    
    /**
     * 处理HTTP请求方法不支持异常
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public Result<Void> handleMethodNotSupportedException(HttpRequestMethodNotSupportedException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        String errorMessage = String.format("请求方法不支持: %s，支持的方法: %s", 
                                           e.getMethod(), String.join(", ", e.getSupportedMethods()));
        
        logger.warn("请求方法不支持 - 用户: {}, 请求: {} {}, 错误: {}", 
                   userInfo, request.getMethod(), request.getRequestURI(), errorMessage);
        return Result.LogicError(errorMessage);
    }
    
    /**
     * 处理404异常
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public Result<Void> handleNoHandlerFoundException(NoHandlerFoundException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        logger.warn("404异常 - 用户: {}, 请求: {} {}", 
                   userInfo, request.getMethod(), request.getRequestURI());
        return Result.LogicError("请求的资源不存在");
    }
    
    /**
     * 处理数据库访问异常
     */
    @ExceptionHandler(DataAccessException.class)
    public Result<Void> handleDataAccessException(DataAccessException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        logger.error("数据库访问异常 - 用户: {}, 请求: {} {}, 错误: {}", 
                    userInfo, request.getMethod(), request.getRequestURI(), e.getMessage(), e);
        return Result.SystemError("数据库操作失败，请稍后重试");
    }

    /**
     * 处理其他运行时异常
     */
    @ExceptionHandler(RuntimeException.class)
    public Result<Void> handleRuntimeException(RuntimeException e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        logger.error("运行时异常 - 用户: {}, 请求: {} {}, 错误: {}", 
                    userInfo, request.getMethod(), request.getRequestURI(), e.getMessage(), e);
        return Result.SystemError("系统内部错误，请联系管理员");
    }
    
    /**
     * 处理其他所有异常
     */
    @ExceptionHandler(Exception.class)
    public Result<Void> handleOtherException(Exception e, HttpServletRequest request) {
        String userInfo = UserContextHolder.getUserSummary();
        logger.error("未知异常 - 用户: {}, 请求: {} {}, 错误: {}", 
                    userInfo, request.getMethod(), request.getRequestURI(), e.getMessage(), e);
        return Result.SystemError("系统繁忙，请稍后重试");
    }
}
