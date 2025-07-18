package com.example.vnollxonlinejudge.handler;

import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;


@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    @ExceptionHandler(BusinessException .class)
    public Result handleBusinessException(BusinessException e) {
        return Result.LogicError(e.getMessage());
    }
    @ExceptionHandler(RuntimeException.class)
    public Result handleRuntimeException(RuntimeException e) {
        return Result.SystemError("服务器错误，请联系管理员");
    }
    @ExceptionHandler(Exception.class)
    public Result handleOtherException(Exception e) {
        logger.error("系统错误", e);
        return Result.SystemError("系统繁忙，请稍后重试");
    }
}
