INSERT INTO ai_model (name, provider, model_code, base_url, logo_url, api_key, extra_config, sort_order, status, proxy_type)
SELECT 'GLM-5.1 (NVIDIA)', 'openai_compatible', 'z-ai/glm-5.1', 'https://integrate.api.nvidia.com/v1', NULL, '', JSON_OBJECT('top_p', 1), 4, 1, 'overseas'
WHERE NOT EXISTS (
    SELECT 1 FROM ai_model WHERE provider = 'openai_compatible' AND model_code = 'z-ai/glm-5.1'
);
