-- =====================================================
-- 新增权限SQL脚本（增量更新）
-- 执行此脚本添加新增的权限
-- =====================================================

-- 新增：提交代码权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('submission:submit', '提交代码', '提交代码进行评测', 'submission')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 新增：AI对话权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('ai:chat', 'AI对话', '使用AI对话功能', 'ai')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 新增：社交功能权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('friend:use', '好友功能', '使用好友功能', 'social'),
('comment:create', '发布评论', '发布评论', 'social'),
('comment:delete', '删除评论', '删除评论', 'social')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- =====================================================
-- 为USER角色添加新权限
-- =====================================================
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 
    (SELECT id FROM role WHERE code = 'USER'),
    id
FROM permission 
WHERE code IN (
    'submission:submit',
    'ai:chat',
    'friend:use',
    'comment:create',
    'comment:delete'
)
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- =====================================================
-- 为ADMIN角色添加新权限（管理员也需要这些用户权限）
-- =====================================================
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 
    (SELECT id FROM role WHERE code = 'ADMIN'),
    id
FROM permission 
WHERE code IN (
    'submission:submit',
    'ai:chat',
    'friend:use',
    'comment:create',
    'comment:delete'
)
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- =====================================================
-- 超级管理员自动拥有所有权限（重新同步）
-- =====================================================
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 
    (SELECT id FROM role WHERE code = 'SUPER_ADMIN'),
    id
FROM permission
WHERE id NOT IN (
    SELECT permission_id FROM role_permission 
    WHERE role_id = (SELECT id FROM role WHERE code = 'SUPER_ADMIN')
)
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;
