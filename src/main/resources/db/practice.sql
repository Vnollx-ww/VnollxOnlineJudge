-- 练习模块数据库表结构

-- 练习表
CREATE TABLE IF NOT EXISTS `practice` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '练习ID',
    `title` VARCHAR(255) NOT NULL COMMENT '练习标题',
    `description` TEXT COMMENT '练习描述',
    `create_time` VARCHAR(50) COMMENT '创建时间',
    `is_public` TINYINT(1) DEFAULT 1 COMMENT '是否公开 1-公开 0-私有',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='练习表';

-- 练习题目关联表
CREATE TABLE IF NOT EXISTS `practice_problem` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '关联ID',
    `practice_id` BIGINT NOT NULL COMMENT '练习ID',
    `problem_id` BIGINT NOT NULL COMMENT '题目ID',
    `problem_order` INT DEFAULT 0 COMMENT '题目顺序',
    PRIMARY KEY (`id`),
    INDEX `idx_practice_id` (`practice_id`),
    INDEX `idx_problem_id` (`problem_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='练习题目关联表';
