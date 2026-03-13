-- 迁移：平台改为仅两种 SDK（langchain4j、zhipu），ai_model 增加 adapter_code
-- 执行前请备份。若从零建库请用 create_tables.sql。

-- 1. 创建 ai_platform 表（若不存在）
CREATE TABLE IF NOT EXISTS ai_platform
(
    id          bigint auto_increment comment '平台ID' primary key,
    code        varchar(50)   not null comment '平台编码: langchain4j | zhipu',
    name        varchar(100)  not null comment '平台显示名称',
    description varchar(256)  null comment '说明',
    sort_order  int default 0 null comment '排序序号',
    status      tinyint default 1 null comment '状态：1-启用，0-禁用',
    create_time datetime default CURRENT_TIMESTAMP null,
    update_time datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    unique key uk_ai_platform_code (code),
    index idx_ai_platform_status (status)
) comment 'AI 平台表' collate = utf8mb4_unicode_ci;

-- 2. 清空并写入新平台数据（仅 langchain4j、zhipu）
DELETE FROM ai_platform;
INSERT INTO ai_platform (id, code, name, description, sort_order, status) VALUES
(1, 'langchain4j', 'LangChain4j', 'OpenAI / Mistral / 阿里云百炼 等，统一走 LangChain4j', 0, 1),
(2, 'zhipu', '智谱 AI', '智谱开放平台，直接使用 zai-sdk 调用', 1, 1);

-- 3. ai_model 增加 adapter_code（若尚无该列）
ALTER TABLE ai_model ADD COLUMN adapter_code varchar(50) NULL COMMENT '平台=langchain4j 时: openai/mistral/dashscope' AFTER platform_id;

-- 4. 将原 platform_id 映射到新平台并回填 adapter_code
-- 原 1=openai 2=mistral 3=dashscope 4=zhipu -> 新 1=langchain4j 2=zhipu
UPDATE ai_model SET platform_id = 1, adapter_code = 'openai' WHERE platform_id = 1;
UPDATE ai_model SET platform_id = 1, adapter_code = 'mistral' WHERE platform_id = 2;
UPDATE ai_model SET platform_id = 1, adapter_code = 'dashscope' WHERE platform_id = 3;
UPDATE ai_model SET platform_id = 2, adapter_code = NULL WHERE platform_id = 4;

-- 5. 可选：插入智谱示例模型（若无 id=2）
INSERT IGNORE INTO ai_model (id, platform_id, adapter_code, name, model_id, logo_url, endpoint, api_key, max_tokens, temperature, timeout_seconds, sort_order, status)
VALUES (2, 2, NULL, '智谱 GLM-4.7', 'glm-4.7', NULL, NULL, 'your-zhipu-api-key', 8192, 0.70, 60, 1, 0);
