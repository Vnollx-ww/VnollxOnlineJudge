-- ==================== 提交：入库时记录前方排队数 ====================
alter table submission add column queue_ahead int null comment '入库时记录的前方排队数快照';
alter table submission add index submission_status_snowflake_id_index (status(20), snowflake_id);
