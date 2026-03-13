-- 迁移：ai_chat_record 表增加 thinking_content 字段（存储思考过程内容）
-- 若表已存在且尚无该列时执行。从零建库请用 create_tables.sql。

ALTER TABLE ai_chat_record
    ADD COLUMN thinking_content text NULL COMMENT '思考过程内容（如智谱 reasoning）' AFTER model_reply;
