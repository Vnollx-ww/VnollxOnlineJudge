-- 为 practice 表添加 creator_id 字段，用于关联教师的教学计划
ALTER TABLE practice ADD COLUMN creator_id BIGINT DEFAULT NULL COMMENT '创建者（教师）ID';

-- 为已有的 practice 记录补充 creator_id（可选，如果有管理员用户 id=1 可设为默认）
-- UPDATE practice SET creator_id = 1 WHERE creator_id IS NULL;

-- 添加索引以加速按教师查询教学计划
CREATE INDEX idx_practice_creator_id ON practice(creator_id);
