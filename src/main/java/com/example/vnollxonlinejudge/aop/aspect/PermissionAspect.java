package com.example.vnollxonlinejudge.aop.aspect;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.annotation.RequireRole;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.entity.Role;
import com.example.vnollxonlinejudge.service.PermissionService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 权限校验切面
 */
@Aspect
@Component
@Order(2)
public class PermissionAspect {
    
    private static final Logger logger = LoggerFactory.getLogger(PermissionAspect.class);
    
    private final PermissionService permissionService;
    
    @Autowired
    public PermissionAspect(PermissionService permissionService) {
        this.permissionService = permissionService;
    }
    
    @Pointcut("@annotation(com.example.vnollxonlinejudge.annotation.RequirePermission)")
    public void permissionPointcut() {}
    
    @Pointcut("@annotation(com.example.vnollxonlinejudge.annotation.RequireRole)")
    public void rolePointcut() {}
    
    @Around("permissionPointcut()")
    public Object checkPermission(ProceedingJoinPoint joinPoint) throws Throwable {
        Long userId = UserContextHolder.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException("请先登录");
        }
        
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequirePermission annotation = method.getAnnotation(RequirePermission.class);
        
        if (annotation == null) {
            return joinPoint.proceed();
        }
        
        String[] requiredPermissions = annotation.value();
        if (requiredPermissions.length == 0) {
            return joinPoint.proceed();
        }
        
        boolean hasPermission;
        if (annotation.logical() == RequirePermission.Logical.AND) {
            hasPermission = permissionService.hasAllPermissions(userId, requiredPermissions);
        } else {
            hasPermission = permissionService.hasAnyPermission(userId, requiredPermissions);
        }
        
        if (!hasPermission) {
            logger.warn("用户 {} 无权限访问 {}.{}, 需要权限: {}", 
                    userId, 
                    method.getDeclaringClass().getSimpleName(), 
                    method.getName(), 
                    String.join(",", requiredPermissions));
            throw new BusinessException("无权限访问该资源");
        }
        
        return joinPoint.proceed();
    }
    
    @Around("rolePointcut()")
    public Object checkRole(ProceedingJoinPoint joinPoint) throws Throwable {
        Long userId = UserContextHolder.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException("请先登录");
        }
        
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireRole annotation = method.getAnnotation(RequireRole.class);
        
        if (annotation == null) {
            return joinPoint.proceed();
        }
        
        String[] requiredRoles = annotation.value();
        if (requiredRoles.length == 0) {
            return joinPoint.proceed();
        }
        
        List<Role> userRoles = permissionService.getUserRoles(userId);
        Set<String> userRoleCodes = userRoles.stream()
                .map(Role::getCode)
                .collect(Collectors.toSet());
        
        boolean hasRole;
        if (annotation.logical() == RequirePermission.Logical.AND) {
            hasRole = true;
            for (String role : requiredRoles) {
                if (!userRoleCodes.contains(role)) {
                    hasRole = false;
                    break;
                }
            }
        } else {
            hasRole = false;
            for (String role : requiredRoles) {
                if (userRoleCodes.contains(role)) {
                    hasRole = true;
                    break;
                }
            }
        }
        
        if (!hasRole) {
            logger.warn("用户 {} 无角色访问 {}.{}, 需要角色: {}", 
                    userId, 
                    method.getDeclaringClass().getSimpleName(), 
                    method.getName(), 
                    String.join(",", requiredRoles));
            throw new BusinessException("无权限访问该资源");
        }
        
        return joinPoint.proceed();
    }
}
