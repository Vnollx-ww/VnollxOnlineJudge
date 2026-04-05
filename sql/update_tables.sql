-- 删除 ai_model 表已废弃字段（已有数据库请先执行此部分）
-- 若为全新安装则跳过，直接使用 create_tables.sql
ALTER TABLE ai_model DROP FOREIGN KEY fk_ai_model_platform;
ALTER TABLE ai_model DROP INDEX idx_ai_model_platform;
ALTER TABLE ai_model DROP INDEX idx_model_id;
ALTER TABLE ai_model DROP COLUMN platform_id;
ALTER TABLE ai_model DROP COLUMN adapter_code;
ALTER TABLE ai_model DROP COLUMN model_id;
ALTER TABLE ai_model DROP COLUMN endpoint;
ALTER TABLE ai_model DROP COLUMN max_tokens;
ALTER TABLE ai_model DROP COLUMN temperature;
ALTER TABLE ai_model DROP COLUMN timeout_seconds;

-- 添加 proxy_type（若不存在需手动执行）
ALTER TABLE ai_model ADD COLUMN proxy_type varchar(20) DEFAULT 'overseas' NULL COMMENT '代理类型：domestic-国内，overseas-国外' AFTER status;

INSERT IGNORE INTO ai_model (id, name, logo_url, api_key, sort_order, status, proxy_type)
VALUES
(7, 'Kimi K2.5', NULL, '', 10, 1, 'domestic'),
(8, 'MiniMax M2.5', NULL, '', 11, 1, 'domestic');

-- submission：评测通过/总测试组数（若列已存在会报错，可忽略后一条）
ALTER TABLE submission ADD COLUMN pass_count int NULL COMMENT '通过的数据组数' AFTER error_info;
ALTER TABLE submission ADD COLUMN test_count int NULL COMMENT '总数据组数' AFTER pass_count;
