-- =====================================================
-- VnollxOnlineJudge 角色权限初始化脚本
-- 角色：超级管理员、管理员、VIP用户、普通用户
-- =====================================================

-- 清空现有数据（谨慎使用！）
-- DELETE FROM role_permission;
-- DELETE FROM user_role;
-- DELETE FROM permission;
-- DELETE FROM role;

-- =====================================================
-- 1. 初始化角色表
-- =====================================================
INSERT INTO role (code, name, description, status, create_time, update_time) VALUES
('SUPER_ADMIN', '超级管理员', '拥有系统所有权限，可管理所有用户和AI系统配置', 1, NOW(), NOW()),
('ADMIN', '管理员', '可管理VIP和普通用户，不能查看AI配置', 1, NOW(), NOW()),
('VIP', 'VIP用户', '高级用户，可使用AI功能', 1, NOW(), NOW()),
('USER', '普通用户', '普通用户，基础功能权限', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    update_time = NOW();

-- =====================================================
-- 2. 初始化权限表
-- =====================================================
INSERT INTO permission (code, name, description, module, status, create_time, update_time) VALUES
-- 用户管理权限
('user:view', '查看用户', '查看用户列表和详情', '用户管理', 1, NOW(), NOW()),
('user:create', '创建用户', '创建新用户', '用户管理', 1, NOW(), NOW()),
('user:update', '编辑用户', '编辑用户信息', '用户管理', 1, NOW(), NOW()),
('user:delete', '删除用户', '删除用户', '用户管理', 1, NOW(), NOW()),
('user:manage', '管理用户', '用户管理的完整权限', '用户管理', 1, NOW(), NOW()),

-- 题目管理权限
('problem:view', '查看题目', '查看题目列表和详情', '题目管理', 1, NOW(), NOW()),
('problem:create', '创建题目', '创建新题目', '题目管理', 1, NOW(), NOW()),
('problem:update', '编辑题目', '编辑题目信息', '题目管理', 1, NOW(), NOW()),
('problem:delete', '删除题目', '删除题目', '题目管理', 1, NOW(), NOW()),
('problem:manage', '管理题目', '题目管理的完整权限', '题目管理', 1, NOW(), NOW()),

-- 比赛管理权限
('competition:view', '查看比赛', '查看比赛列表和详情', '比赛管理', 1, NOW(), NOW()),
('competition:create', '创建比赛', '创建新比赛', '比赛管理', 1, NOW(), NOW()),
('competition:update', '编辑比赛', '编辑比赛信息', '比赛管理', 1, NOW(), NOW()),
('competition:delete', '删除比赛', '删除比赛', '比赛管理', 1, NOW(), NOW()),
('competition:manage', '管理比赛', '比赛管理的完整权限', '比赛管理', 1, NOW(), NOW()),

-- 练习管理权限
('practice:view', '查看练习', '查看练习列表和详情', '练习管理', 1, NOW(), NOW()),
('practice:create', '创建练习', '创建新练习', '练习管理', 1, NOW(), NOW()),
('practice:update', '编辑练习', '编辑练习信息', '练习管理', 1, NOW(), NOW()),
('practice:delete', '删除练习', '删除练习', '练习管理', 1, NOW(), NOW()),
('practice:manage', '管理练习', '练习管理的完整权限', '练习管理', 1, NOW(), NOW()),

-- 提交记录权限
('submission:view', '查看提交', '查看自己的提交记录', '提交管理', 1, NOW(), NOW()),
('submission:view_all', '查看所有提交', '查看所有用户的提交记录', '提交管理', 1, NOW(), NOW()),
('submission:rejudge', '重新评测', '重新评测提交', '提交管理', 1, NOW(), NOW()),
('submission:submit', '提交代码', '提交代码进行评测', '提交管理', 1, NOW(), NOW()),

-- 题解管理权限
('solve:view', '查看题解', '查看题解列表', '题解管理', 1, NOW(), NOW()),
('solve:create', '发布题解', '发布新题解', '题解管理', 1, NOW(), NOW()),
('solve:update', '编辑题解', '编辑自己的题解', '题解管理', 1, NOW(), NOW()),
('solve:delete', '删除题解', '删除题解', '题解管理', 1, NOW(), NOW()),
('solve:audit', '审核题解', '审核题解通过或不通过', '题解管理', 1, NOW(), NOW()),

-- 标签管理权限
('tag:view', '查看标签', '查看标签列表', '标签管理', 1, NOW(), NOW()),
('tag:create', '创建标签', '创建新标签', '标签管理', 1, NOW(), NOW()),
('tag:update', '编辑标签', '编辑标签', '标签管理', 1, NOW(), NOW()),
('tag:delete', '删除标签', '删除标签', '标签管理', 1, NOW(), NOW()),

-- 通知管理权限
('notification:view', '查看通知', '查看通知', '通知管理', 1, NOW(), NOW()),
('notification:create', '发布通知', '发布系统通知', '通知管理', 1, NOW(), NOW()),
('notification:delete', '删除通知', '删除通知', '通知管理', 1, NOW(), NOW()),

-- 社交功能权限
('friend:use', '好友功能', '使用好友功能', '社交功能', 1, NOW(), NOW()),
('comment:create', '发布评论', '发布评论', '社交功能', 1, NOW(), NOW()),
('comment:delete', '删除评论', '删除评论', '社交功能', 1, NOW(), NOW()),

-- AI配置权限
('ai:config_view', '查看AI配置', '查看AI系统配置', 'AI功能', 1, NOW(), NOW()),
('ai:config_update', '修改AI配置', '修改AI系统配置', 'AI功能', 1, NOW(), NOW()),
('ai:chat', 'AI对话', '使用AI助手对话功能', 'AI功能', 1, NOW(), NOW()),

-- 系统管理权限
('system:settings', '系统设置', '修改系统设置', '系统管理', 1, NOW(), NOW()),
('system:monitor', '系统监控', '查看系统监控', '系统管理', 1, NOW(), NOW()),
('system:log', '系统日志', '查看系统日志', '系统管理', 1, NOW(), NOW()),

-- 角色权限管理
('role:view', '查看角色', '查看角色列表', '权限管理', 1, NOW(), NOW()),
('role:create', '创建角色', '创建新角色', '权限管理', 1, NOW(), NOW()),
('role:update', '编辑角色', '编辑角色', '权限管理', 1, NOW(), NOW()),
('role:delete', '删除角色', '删除角色', '权限管理', 1, NOW(), NOW()),
('permission:assign', '分配权限', '为角色分配权限', '权限管理', 1, NOW(), NOW())

ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    module = VALUES(module),
    update_time = NOW();

-- =====================================================
-- 3. 分配角色权限
-- =====================================================

-- 清空现有角色权限关联（可选）
DELETE FROM role_permission WHERE role_id IN (
    SELECT id FROM role WHERE code IN ('SUPER_ADMIN', 'ADMIN', 'VIP', 'USER')
);

-- -----------------------------------------------------
-- 超级管理员：拥有所有权限
-- -----------------------------------------------------
INSERT INTO role_permission (role_id, permission_id, create_time)
SELECT r.id, p.id, NOW()
FROM role r, permission p
WHERE r.code = 'SUPER_ADMIN';

-- -----------------------------------------------------
-- 管理员：除AI配置外的管理权限
-- 不能查看/修改AI配置，不能管理权限分配
-- -----------------------------------------------------
INSERT INTO role_permission (role_id, permission_id, create_time)
SELECT r.id, p.id, NOW()
FROM role r, permission p
WHERE r.code = 'ADMIN'
AND p.code IN (
    -- 用户管理（仅查看和基础操作，不包括manage）
    'user:view', 'user:create', 'user:update', 'user:delete',

    -- 题目管理
    'problem:view', 'problem:create', 'problem:update', 'problem:delete', 'problem:manage',

    -- 比赛管理
    'competition:view', 'competition:create', 'competition:update', 'competition:delete', 'competition:manage',

    -- 练习管理
    'practice:view', 'practice:create', 'practice:update', 'practice:delete', 'practice:manage',

    -- 提交管理
    'submission:view', 'submission:view_all', 'submission:rejudge', 'submission:submit',

    -- 题解管理
    'solve:view', 'solve:create', 'solve:update', 'solve:delete', 'solve:audit',

    -- 标签管理
    'tag:view', 'tag:create', 'tag:update', 'tag:delete',

    -- 通知管理
    'notification:view', 'notification:create', 'notification:delete',

    -- 社交功能
    'friend:use', 'comment:create', 'comment:delete',

    -- AI对话（可以使用，但不能配置）
    'ai:chat',

    -- 角色查看（不能分配权限）
    'role:view'
);

-- -----------------------------------------------------
-- VIP用户：增强用户权限 + AI功能
-- -----------------------------------------------------
INSERT INTO role_permission (role_id, permission_id, create_time)
SELECT r.id, p.id, NOW()
FROM role r, permission p
WHERE r.code = 'VIP'
AND p.code IN (
    -- 题目查看
    'problem:view',

    -- 比赛查看
    'competition:view',

    -- 练习查看
    'practice:view',

    -- 提交权限
    'submission:view', 'submission:submit',

    -- 题解权限
    'solve:view', 'solve:create', 'solve:update',

    -- 标签查看
    'tag:view',

    -- 通知查看
    'notification:view',

    -- 社交功能
    'friend:use', 'comment:create',

    -- AI对话功能
    'ai:chat'
);

-- -----------------------------------------------------
-- 普通用户：基础权限，无AI功能
-- -----------------------------------------------------
INSERT INTO role_permission (role_id, permission_id, create_time)
SELECT r.id, p.id, NOW()
FROM role r, permission p
WHERE r.code = 'USER'
AND p.code IN (
    -- 题目查看
    'problem:view',

    -- 比赛查看
    'competition:view',

    -- 练习查看
    'practice:view',

    -- 提交权限
    'submission:view', 'submission:submit',

    -- 题解权限
    'solve:view', 'solve:create', 'solve:update',

    -- 标签查看
    'tag:view',

    -- 通知查看
    'notification:view',

    -- 社交功能
    'friend:use', 'comment:create'

    -- 注意：普通用户没有 ai:chat 权限
);

-- =====================================================
-- 4. 初始化用户角色关联
-- 根据用户当前的 identity 字段分配对应角色
-- =====================================================

-- 清空现有用户角色关联（可选）
-- DELETE FROM user_role;

-- 根据 identity 字段自动分配对应角色
INSERT INTO user_role (user_id, role_id, create_time)
SELECT u.id, r.id, NOW()
FROM user u
JOIN role r ON u.identity = r.code
WHERE u.identity IN ('SUPER_ADMIN', 'ADMIN', 'VIP', 'USER')
ON DUPLICATE KEY UPDATE create_time = NOW();

-- =====================================================
-- 5. 验证查询
-- =====================================================

-- 查看各角色权限数量
SELECT r.code AS 角色, r.name AS 角色名称, COUNT(rp.id) AS 权限数量
FROM role r
LEFT JOIN role_permission rp ON r.id = rp.role_id
GROUP BY r.id, r.code, r.name
ORDER BY COUNT(rp.id) DESC;

-- 查看用户角色分配结果
SELECT u.id AS 用户ID, u.name AS 用户名, u.identity AS 原身份, r.code AS 角色码, r.name AS 角色名称
FROM user u
LEFT JOIN user_role ur ON u.id = ur.user_id
LEFT JOIN role r ON ur.role_id = r.id
ORDER BY u.id;

-- 查看各角色的AI相关权限
SELECT r.code AS 角色, r.name AS 角色名称, p.code AS 权限码, p.name AS 权限名称
FROM role r
LEFT JOIN role_permission rp ON r.id = rp.role_id
LEFT JOIN permission p ON rp.permission_id = p.id
WHERE p.module = 'AI功能'
ORDER BY r.id, p.id;
