INSERT IGNORE INTO ai_model (id, platform_id, adapter_code, name, model_id, logo_url, endpoint, api_key, max_tokens, temperature, timeout_seconds, sort_order, status, proxy_type)
VALUES
(7, 3, 'kimi', 'Kimi K2.5', 'kimi-k2.5', NULL, 'https://dashscope.aliyuncs.com/compatible-mode/v1', '', 8192, 0.70, 60, 10, 1, 'domestic'),
(8, 3, 'minimax', 'MiniMax M2.5', 'MiniMax-M2.5', NULL, 'https://dashscope.aliyuncs.com/compatible-mode/v1', '', 8192, 0.70, 60, 11, 1, 'domestic');