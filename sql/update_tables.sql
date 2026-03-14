-- =====================================================
-- ai_chat_session 表（用于升级旧数据库）
-- 注意：user.id 是 int，所以这里 user_id 也必须是 int
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_chat_session
(
    id              varchar(64)                          NOT NULL COMMENT '会话ID',
    user_id         int                                  NOT NULL COMMENT '用户ID',
    title           varchar(120)                         NULL COMMENT '会话标题',
    last_model_id   bigint                               NULL COMMENT '最近一次使用的模型ID',
    message_count   int          DEFAULT 0               NULL COMMENT '消息轮数',
    last_message_at datetime                             NULL COMMENT '最后一条消息时间',
    create_time     datetime     DEFAULT CURRENT_TIMESTAMP NULL COMMENT '创建时间',
    update_time     datetime     DEFAULT CURRENT_TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_chat_session_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_chat_session_model FOREIGN KEY (last_model_id) REFERENCES ai_model (id) ON DELETE SET NULL,
    INDEX idx_ai_chat_session_user (user_id),
    INDEX idx_ai_chat_session_last_message (user_id, last_message_at),
    INDEX idx_ai_chat_session_update (user_id, update_time)
) COMMENT='用户AI会话表' COLLATE = utf8mb4_unicode_ci;

-- =====================================================
-- AI 摘要表新增 session_id，改为按会话隔离
-- 注意：如果 ai_chat_summary 表是通过 create_tables.sql 创建的，
--       则 session_id 列和索引已存在，下面的语句会报错但不影响使用
-- =====================================================

-- 添加 session_id 列（如果已存在会报错，可忽略）
-- ALTER TABLE ai_chat_summary ADD COLUMN session_id varchar(64) NULL COMMENT '会话ID' AFTER user_id;

-- 创建索引（如果已存在会报错，可忽略）
-- CREATE INDEX idx_ai_chat_summary_session ON ai_chat_summary (user_id, session_id);
