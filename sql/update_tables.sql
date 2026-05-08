-- ==================== 比赛防作弊：事件表 ====================
create table if not exists competition_anti_cheat_event
(
    id               bigint auto_increment primary key,
    competition_id   bigint        not null comment '比赛ID',
    problem_id       bigint        null comment '题目ID',
    user_id          bigint        not null comment '用户ID',
    username         varchar(255)  null comment '冗余用户名',
    event_type       varchar(64)   not null comment '事件类型：PAGE_HIDDEN/WINDOW_BLUR/FULLSCREEN_EXIT/PASTE_CODE/COPY_CODE/CONTEXT_MENU/SUBMIT_AFTER_LEAVE 等',
    risk_level       varchar(16)   not null default 'LOW' comment 'LOW/MEDIUM/HIGH/CRITICAL',
    risk_score       int           not null default 0 comment '单事件风险分',
    started_at       varchar(32)   null comment '事件开始时间',
    ended_at         varchar(32)   null comment '事件结束时间',
    duration_seconds int           null comment '持续秒数',
    submission_id    bigint        null comment '关联提交ID',
    detail_json      text          null comment '事件详情 JSON',
    ip_address       varchar(64)   null comment '来源IP',
    user_agent       varchar(512)  null comment 'User-Agent',
    created_at       datetime default CURRENT_TIMESTAMP not null comment '创建时间'
) comment '比赛防作弊事件表' collate = utf8mb4_unicode_ci;

create index if not exists idx_acc_event_cid_uid on competition_anti_cheat_event (competition_id, user_id);
create index if not exists idx_acc_event_cid_type on competition_anti_cheat_event (competition_id, event_type);
create index if not exists idx_acc_event_created on competition_anti_cheat_event (created_at);

-- ==================== 比赛防作弊：用户风险汇总表 ====================
create table if not exists competition_anti_cheat_summary
(
    id                   bigint auto_increment primary key,
    competition_id       bigint        not null comment '比赛ID',
    user_id              bigint        not null comment '用户ID',
    username             varchar(255)  null comment '冗余用户名',
    total_score          int           not null default 0 comment '累计风险分',
    risk_level           varchar(16)   not null default 'LOW' comment 'LOW/MEDIUM/HIGH/CRITICAL',
    event_count          int           not null default 0 comment '事件总数',
    leave_count          int           not null default 0 comment '离开页面次数',
    leave_total_seconds  int           not null default 0 comment '累计离开秒数',
    fullscreen_exit_count int          not null default 0 comment '退出全屏次数',
    paste_count          int           not null default 0 comment '粘贴次数',
    last_event_at        datetime      null comment '最近事件时间',
    review_status        varchar(16)   not null default 'PENDING' comment 'PENDING/CONFIRMED/REJECTED/IGNORED',
    review_result        varchar(32)   null comment 'NORMAL/WARNING/CHEATING/NEED_MORE_EVIDENCE',
    reviewer_id          bigint        null comment '复核管理员ID',
    review_note          varchar(1024) null comment '人工备注',
    reviewed_at          datetime      null comment '复核时间',
    created_at           datetime default CURRENT_TIMESTAMP not null,
    updated_at           datetime default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP not null,
    constraint uk_acc_summary_cid_uid unique (competition_id, user_id)
) comment '比赛防作弊用户汇总表' collate = utf8mb4_unicode_ci;

create index if not exists idx_acc_summary_cid_score on competition_anti_cheat_summary (competition_id, total_score);
create index if not exists idx_acc_summary_review on competition_anti_cheat_summary (competition_id, review_status);

-- ==================== 比赛防作弊：权限初始化/补丁 ====================
insert into permission (code, name, description, module)
values
    ('competition:anti_cheat_view', '查看比赛防作弊', '查看比赛防作弊事件、风险汇总和证据链', 'competition'),
    ('competition:anti_cheat_review', '复核比赛防作弊', '人工复核比赛防作弊风险记录', 'competition')
on duplicate key update
    name = values(name),
    description = values(description),
    module = values(module),
    status = 1;

insert ignore into role_permission (role_id, permission_id)
select r.id, p.id
from role r
         join permission p on p.code in ('competition:anti_cheat_view', 'competition:anti_cheat_review')
where r.code in ('SUPER_ADMIN', 'ADMIN', 'TEACHER');