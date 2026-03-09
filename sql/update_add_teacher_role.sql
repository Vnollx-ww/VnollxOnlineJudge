-- =====================================================
-- 新增教师角色及权限（增量更新脚本）
-- 执行前请确保已存在 permission 表及对应权限数据
-- 与 init_role_permissions.sql 中的权限码一致
-- =====================================================

-- =====================================================
-- 1. 新增教师角色
-- =====================================================
INSERT INTO role (code, name, description, status, create_time, update_time)
VALUES ('TEACHER', '教师', '教师角色，可管理题目/比赛/练习、查看学生提交与数据统计', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    update_time = NOW();

-- =====================================================
-- 2. 删除该角色已有权限关联（避免重复执行时重复插入）
-- =====================================================
DELETE rp FROM role_permission rp
INNER JOIN role r ON rp.role_id = r.id
WHERE r.code = 'TEACHER';

-- =====================================================
-- 3. 为教师角色分配权限
-- =====================================================
INSERT INTO role_permission (role_id, permission_id, create_time)
SELECT r.id, p.id, NOW()
FROM role r
JOIN permission p ON p.code IN (
    -- 题目管理（查看、创建、编辑、删除）
    'problem:view', 'problem:create', 'problem:update', 'problem:delete', 'problem:manage',

    -- 比赛管理
    'competition:view', 'competition:create', 'competition:update', 'competition:delete', 'competition:manage',

    -- 练习管理
    'practice:view', 'practice:create', 'practice:update', 'practice:delete', 'practice:manage',

    -- 提交管理（查看自己的、查看全部、提交、重新评测）
    'submission:view', 'submission:view_all', 'submission:submit', 'submission:rejudge',

    -- 题解管理（查看、发布、编辑、删除、审核）
    'solve:view', 'solve:create', 'solve:update', 'solve:delete', 'solve:audit',

    -- 标签管理
    'tag:view', 'tag:create', 'tag:update', 'tag:delete',

    -- 通知管理（查看、发布）
    'notification:view', 'notification:create', 'notification:delete',

    -- 社交与评论
    'friend:use', 'comment:create', 'comment:delete',

    -- 系统监控（数据统计）
    'system:monitor',

    -- 角色（仅查看）
    'role:view',

    -- AI 对话
    'ai:chat'
)
WHERE r.code = 'TEACHER';

-- =====================================================
-- 4. 可选：将已有 identity='TEACHER' 的用户关联到教师角色
--    若 user 表有 identity 字段且存在教师用户，可取消下面注释执行
-- =====================================================
-- INSERT INTO user_role (user_id, role_id, create_time)
-- SELECT u.id, r.id, NOW()
-- FROM user u
-- CROSS JOIN role r
-- WHERE u.identity = 'TEACHER' AND r.code = 'TEACHER'
-- ON DUPLICATE KEY UPDATE create_time = NOW();
