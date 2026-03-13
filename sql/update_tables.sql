-- =====================================================
-- 数据库升级脚本：添加 AI 对话摘要功能和 DashScope 平台
-- 执行时间：2026-03-14
-- =====================================================

-- 1. 添加 DashScope 平台
INSERT INTO ai_platform (id, code, name, description, sort_order, status) VALUES
(3, 'dashscope', '阿里云 DashScope', '阿里云百炼平台，直接使用 dashscope-sdk 调用', 2, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

-- 2. 添加 DeepSeek v3.1 模型
INSERT INTO ai_model (id, platform_id, adapter_code, name, model_id, logo_url, endpoint, api_key, max_tokens, temperature, timeout_seconds, sort_order, status)
VALUES
(4, 3, NULL, 'DeepSeek v3.1', 'deepseek-v3.1', NULL, NULL, 'your-dashscope-api-key', 8192, 0.70, 60, 3, 1)
ON DUPLICATE KEY UPDATE
  platform_id = VALUES(platform_id),
  name = VALUES(name),
  model_id = VALUES(model_id),
  max_tokens = VALUES(max_tokens),
  temperature = VALUES(temperature),
  timeout_seconds = VALUES(timeout_seconds),
  sort_order = VALUES(sort_order),
  status = VALUES(status);
