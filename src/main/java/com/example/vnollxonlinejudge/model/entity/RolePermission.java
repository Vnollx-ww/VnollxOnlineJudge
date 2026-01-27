package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import jakarta.persistence.Column;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 角色-权限关联表
 */
@Table(name = "role_permission")
@TableName("role_permission")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RolePermission {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    @Column(name = "role_id")
    private Long roleId;
    
    @Column(name = "permission_id")
    private Long permissionId;
    
    @Column(name = "create_time")
    private LocalDateTime createTime;
}
