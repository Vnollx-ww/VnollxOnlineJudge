-- ==================== 比赛：防作弊模式 ====================
alter table competition
    add column anti_cheat_mode varchar(16) not null default 'NORMAL';