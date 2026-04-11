-- 为 practice 表添加 creator_id 字段，用于关联教师的教学计划
ALTER TABLE practice ADD COLUMN creator_id BIGINT DEFAULT NULL COMMENT '创建者（教师）ID';

-- 添加索引以加速按教师查询教学计划
CREATE INDEX idx_practice_creator_id ON practice(creator_id);
