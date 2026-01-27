-- =====================================================
-- 权限系统数据库表初始化脚本
-- =====================================================

-- 角色表
CREATE TABLE IF NOT EXISTS `role` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '角色ID',
    `code` VARCHAR(50) NOT NULL UNIQUE COMMENT '角色码',
    `name` VARCHAR(100) NOT NULL COMMENT '角色名称',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '角色描述',
    `status` TINYINT DEFAULT 1 COMMENT '状态：1-启用，0-禁用',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_code` (`code`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- 权限表
CREATE TABLE IF NOT EXISTS `permission` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '权限ID',
    `code` VARCHAR(100) NOT NULL UNIQUE COMMENT '权限码',
    `name` VARCHAR(100) NOT NULL COMMENT '权限名称',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '权限描述',
    `module` VARCHAR(50) DEFAULT NULL COMMENT '所属模块',
    `status` TINYINT DEFAULT 1 COMMENT '状态：1-启用，0-禁用',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_code` (`code`),
    INDEX `idx_module` (`module`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表';

-- 角色-权限关联表
CREATE TABLE IF NOT EXISTS `role_permission` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    `role_id` BIGINT NOT NULL COMMENT '角色ID',
    `permission_id` BIGINT NOT NULL COMMENT '权限ID',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
    INDEX `idx_role_id` (`role_id`),
    INDEX `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色-权限关联表';

-- 用户-角色关联表
CREATE TABLE IF NOT EXISTS `user_role` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `role_id` BIGINT NOT NULL COMMENT '角色ID',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户-角色关联表';

-- =====================================================
-- 初始化角色数据
-- =====================================================
INSERT INTO `role` (`code`, `name`, `description`) VALUES
('SUPER_ADMIN', '超级管理员', '拥有系统所有权限'),
('ADMIN', '管理员', '拥有大部分管理权限'),
('USER', '普通用户', '拥有基本使用权限'),
('GUEST', '游客', '只有查看权限')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- =====================================================
-- 初始化权限数据
-- =====================================================

-- 用户管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('user:view', '查看用户', '查看用户列表和详情', 'user'),
('user:create', '创建用户', '创建新用户', 'user'),
('user:update', '更新用户', '更新用户信息', 'user'),
('user:delete', '删除用户', '删除用户', 'user'),
('user:manage', '管理用户', '用户管理的完整权限', 'user')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 题目管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('problem:view', '查看题目', '查看题目列表和详情', 'problem'),
('problem:create', '创建题目', '创建新题目', 'problem'),
('problem:update', '更新题目', '更新题目信息', 'problem'),
('problem:delete', '删除题目', '删除题目', 'problem'),
('problem:manage', '管理题目', '题目管理的完整权限', 'problem')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 比赛管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('competition:view', '查看比赛', '查看比赛列表和详情', 'competition'),
('competition:create', '创建比赛', '创建新比赛', 'competition'),
('competition:update', '更新比赛', '更新比赛信息', 'competition'),
('competition:delete', '删除比赛', '删除比赛', 'competition'),
('competition:manage', '管理比赛', '比赛管理的完整权限', 'competition')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 练习管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('practice:view', '查看练习', '查看练习列表和详情', 'practice'),
('practice:create', '创建练习', '创建新练习', 'practice'),
('practice:update', '更新练习', '更新练习信息', 'practice'),
('practice:delete', '删除练习', '删除练习', 'practice'),
('practice:manage', '管理练习', '练习管理的完整权限', 'practice')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 提交记录权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('submission:view', '查看提交', '查看自己的提交记录', 'submission'),
('submission:view_all', '查看所有提交', '查看所有用户的提交记录', 'submission'),
('submission:rejudge', '重新评测', '重新评测提交', 'submission'),
('submission:submit', '提交代码', '提交代码进行评测', 'submission')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 题解管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('solve:view', '查看题解', '查看题解', 'solve'),
('solve:create', '创建题解', '创建新题解', 'solve'),
('solve:update', '更新题解', '更新题解', 'solve'),
('solve:delete', '删除题解', '删除题解', 'solve'),
('solve:audit', '审核题解', '审核题解', 'solve')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 标签管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('tag:view', '查看标签', '查看标签列表', 'tag'),
('tag:create', '创建标签', '创建新标签', 'tag'),
('tag:update', '更新标签', '更新标签', 'tag'),
('tag:delete', '删除标签', '删除标签', 'tag')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 通知管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('notification:view', '查看通知', '查看通知', 'notification'),
('notification:create', '创建通知', '创建系统通知', 'notification'),
('notification:delete', '删除通知', '删除通知', 'notification')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 社交功能权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('friend:use', '好友功能', '使用好友功能', 'social'),
('comment:create', '发布评论', '发布评论', 'social'),
('comment:delete', '删除评论', '删除评论', 'social')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- AI配置权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('ai:config_view', '查看AI配置', '查看AI配置', 'ai'),
('ai:config_update', '更新AI配置', '更新AI配置', 'ai'),
('ai:chat', 'AI对话', '使用AI对话功能', 'ai')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 系统管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('system:settings', '系统设置', '修改系统设置', 'system'),
('system:monitor', '系统监控', '查看系统监控信息', 'system'),
('system:log', '系统日志', '查看系统日志', 'system')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 角色权限管理
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('role:view', '查看角色', '查看角色列表', 'role'),
('role:create', '创建角色', '创建新角色', 'role'),
('role:update', '更新角色', '更新角色信息', 'role'),
('role:delete', '删除角色', '删除角色', 'role'),
('permission:assign', '分配权限', '为角色分配权限', 'role')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- =====================================================
-- 初始化角色-权限关联（超级管理员拥有所有权限）
-- =====================================================
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 
    (SELECT id FROM role WHERE code = 'SUPER_ADMIN'),
    id
FROM permission
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- 管理员权限（除了系统设置和角色权限管理）
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 
    (SELECT id FROM role WHERE code = 'ADMIN'),
    id
FROM permission 
WHERE module NOT IN ('system', 'role')
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- 普通用户权限
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 
    (SELECT id FROM role WHERE code = 'USER'),
    id
FROM permission 
WHERE code IN (
    'problem:view', 
    'competition:view', 
    'practice:view', 
    'submission:view',
    'submission:submit',
    'solve:view', 
    'solve:create',
    'tag:view',
    'notification:view',
    'ai:chat',
    'friend:use',
    'comment:create',
    'comment:delete'
)
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- 游客权限
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 
    (SELECT id FROM role WHERE code = 'GUEST'),
    id
FROM permission 
WHERE code IN (
    'problem:view', 
    'competition:view', 
    'solve:view',
    'tag:view'
)
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- =====================================================
-- 为现有用户分配角色（根据identity字段迁移）
-- =====================================================
-- 注意：执行前请确认user表中的identity字段值

-- 将SUPER_ADMIN身份的用户关联到超级管理员角色
INSERT INTO `user_role` (`user_id`, `role_id`)
SELECT u.id, r.id
FROM `user` u, `role` r
WHERE u.identity = 'SUPER_ADMIN' AND r.code = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE `user_id` = `user_id`;

-- 将ADMIN身份的用户关联到管理员角色
INSERT INTO `user_role` (`user_id`, `role_id`)
SELECT u.id, r.id
FROM `user` u, `role` r
WHERE u.identity = 'ADMIN' AND r.code = 'ADMIN'
ON DUPLICATE KEY UPDATE `user_id` = `user_id`;

-- 将普通用户关联到USER角色
INSERT INTO `user_role` (`user_id`, `role_id`)
SELECT u.id, r.id
FROM `user` u, `role` r
WHERE (u.identity IS NULL OR u.identity = '' OR u.identity = 'USER') AND r.code = 'USER'
ON DUPLICATE KEY UPDATE `user_id` = `user_id`;
