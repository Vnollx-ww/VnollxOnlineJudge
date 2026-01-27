create table comment
(
    id          bigint auto_increment
        primary key,
    content     text         not null,
    username    varchar(255) not null,
    create_time varchar(255) not null,
    problem_id  bigint       not null,
    parent_id   bigint       null,
    user_id     bigint       null comment 'id'
);

create index idx_create_time
    on comment (create_time);

create index idx_parent_id
    on comment (parent_id);

create index idx_problem_id
    on comment (problem_id);

create index idx_user_id
    on comment (user_id);

create table competition
(
    id            int auto_increment
        primary key,
    title         varchar(255)  not null,
    description   text          null,
    begin_time    varchar(100)  not null,
    end_time      varchar(100)  not null,
    password      varchar(255)  null,
    need_password tinyint(1)    null,
    number        int default 0 null
);

create table friend
(
    id          bigint auto_increment
        primary key,
    user_id     bigint                             not null comment '用户ID',
    friend_id   bigint                             not null comment '好友ID',
    status      tinyint  default 0                 not null comment '状态: 0-待确认, 1-已同意, 2-已拒绝',
    create_time datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint uk_user_friend
        unique (user_id, friend_id)
)
    comment '好友关系表' collate = utf8mb4_unicode_ci;

create index idx_friend_id
    on friend (friend_id);

create index idx_status
    on friend (status);

create index idx_user_id
    on friend (user_id);

create table notification
(
    id          bigint auto_increment
        primary key,
    title       varchar(255)         not null,
    description text                 null,
    create_time varchar(100)         null,
    uid         bigint               not null,
    is_read     tinyint(1) default 0 null,
    comment_id  bigint               null
)
    collate = utf8mb4_unicode_ci;

create index idx_create_time
    on notification (create_time);

create index notification_uid_is_read_index
    on notification (uid, is_read);

create table permission
(
    id          bigint auto_increment comment '权限ID'
        primary key,
    code        varchar(100)                       not null comment '权限码',
    name        varchar(100)                       not null comment '权限名称',
    description varchar(255)                       null comment '权限描述',
    module      varchar(50)                        null comment '所属模块',
    status      tinyint  default 1                 null comment '状态：1-启用，0-禁用',
    create_time datetime default CURRENT_TIMESTAMP null comment '创建时间',
    update_time datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint code
        unique (code)
)
    comment '权限表';

create index idx_code
    on permission (code);

create index idx_module
    on permission (module);

create index idx_status
    on permission (status);

create table practice
(
    id          bigint auto_increment comment '练习ID'
        primary key,
    title       varchar(255)         not null comment '练习标题',
    description text                 null comment '练习描述',
    create_time varchar(50)          null comment '创建时间',
    is_public   tinyint(1) default 1 null comment '是否公开 1-公开 0-私有'
)
    comment '练习表';

create table practice_problem
(
    id            bigint auto_increment comment '关联ID'
        primary key,
    practice_id   bigint        not null comment '练习ID',
    problem_id    bigint        not null comment '题目ID',
    problem_order int default 0 null comment '题目顺序'
)
    comment '练习题目关联表';

create index idx_practice_id
    on practice_problem (practice_id);

create index idx_problem_id
    on practice_problem (problem_id);

create table private_message
(
    id                  bigint auto_increment
        primary key,
    sender_id           bigint                               not null comment '发送者ID',
    receiver_id         bigint                               not null comment '接收者ID',
    content             text                                 not null comment '消息内容(支持Emoji)',
    is_read             tinyint(1) default 0                 not null comment '是否已读',
    create_time         datetime   default CURRENT_TIMESTAMP not null comment '发送时间',
    deleted_by_sender   tinyint(1) default 0                 null,
    deleted_by_receiver tinyint(1) default 0                 null
)
    comment '私信表' collate = utf8mb4_unicode_ci;

create index idx_conversation
    on private_message (sender_id, receiver_id, create_time);

create index idx_create_time
    on private_message (create_time);

create index idx_receiver_id
    on private_message (receiver_id);

create index idx_sender_id
    on private_message (sender_id);

create table problem
(
    id             bigint auto_increment
        primary key,
    title          varchar(255)         null,
    description    text                 null,
    time_limit     int                  null,
    memory_limit   int                  null,
    difficulty     varchar(255)         null,
    input_example  varchar(255)         null,
    output_example varchar(255)         null,
    datazip        varchar(255)         null,
    hint           text                 null,
    input_format   text                 null,
    output_format  text                 null,
    submit_count   int        default 0 null,
    pass_count     int        default 0 null,
    open           tinyint(1) default 0 null,
    version        int        default 1 null,
    snake_id       bigint               null
);

create table competition_problem
(
    id             int auto_increment
        primary key,
    problem_id     bigint        not null,
    competition_id int           not null,
    submit_count   int default 0 null,
    pass_count     int default 0 null,
    constraint problem_id
        unique (problem_id, competition_id),
    constraint competition_problem_ibfk_1
        foreign key (problem_id) references problem (id),
    constraint competition_problem_ibfk_2
        foreign key (competition_id) references competition (id)
);

create index competition_id
    on competition_problem (competition_id);

create index idx_problem_id
    on problem (id);

create table role
(
    id          bigint auto_increment comment '角色ID'
        primary key,
    code        varchar(50)                        not null comment '角色码',
    name        varchar(100)                       not null comment '角色名称',
    description varchar(255)                       null comment '角色描述',
    status      tinyint  default 1                 null comment '状态：1-启用，0-禁用',
    create_time datetime default CURRENT_TIMESTAMP null comment '创建时间',
    update_time datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint code
        unique (code)
)
    comment '角色表';

create index idx_code
    on role (code);

create index idx_status
    on role (status);

create table role_permission
(
    id            bigint auto_increment comment '主键ID'
        primary key,
    role_id       bigint                             not null comment '角色ID',
    permission_id bigint                             not null comment '权限ID',
    create_time   datetime default CURRENT_TIMESTAMP null comment '创建时间',
    constraint uk_role_permission
        unique (role_id, permission_id)
)
    comment '角色-权限关联表';

create index idx_permission_id
    on role_permission (permission_id);

create index idx_role_id
    on role_permission (role_id);

create table solve
(
    id           int auto_increment
        primary key,
    content      text        null,
    uid          bigint      null,
    pid          bigint      null,
    create_time  varchar(50) null,
    name         varchar(50) null,
    problem_name varchar(50) null,
    title        text        not null,
    status       int         null
);

create table submission
(
    id           bigint auto_increment comment 'ID'
        primary key,
    user_name    varchar(50)      null,
    status       text             null comment 'Pending, Accepted, WrongAnswer',
    create_time  varchar(50)      null comment 'YYYY-MM-DD HH:mm:ss',
    language     varchar(20)      null comment 'C++, Java, Python',
    pid          bigint           null comment 'ID',
    time         int              null,
    uid          bigint           null,
    problem_name varchar(255)     null,
    code         text             null,
    cid          bigint default 0 null,
    memory       int              not null,
    snowflake_id bigint           null,
    error_info   text             null
);

create index submission_snowflake_id_index
    on submission (snowflake_id);

create table tag
(
    id   bigint auto_increment
        primary key,
    name varchar(50) not null,
    constraint name
        unique (name)
);

create table problem_tag
(
    problem_id  bigint       not null,
    create_time varchar(255) null,
    tag_name    varchar(50)  not null,
    constraint idx_problem_tag
        unique (problem_id, tag_name),
    constraint fk_problem_tags_tag_name
        foreign key (tag_name) references tag (name),
    constraint problem_tag_ibfk_1
        foreign key (problem_id) references problem (id)
            on delete cascade
);

create index idx_problem_id
    on problem_tag (problem_id);

create table user
(
    id              int auto_increment
        primary key,
    name            varchar(255)                  not null,
    password        varchar(255) default '123456' null,
    email           varchar(255)                  not null,
    submit_count    int          default 0        null,
    pass_count      int          default 0        null,
    penalty_time    int          default 0        null,
    version         int          default 1        null,
    identity        varchar(50)  default 'USER'   not null,
    salt            varchar(255)                  null,
    avatar          varchar(255)                  null,
    signature       varchar(128)                  null,
    last_login_time datetime                      null,
    constraint email
        unique (email)
);

create table competition_user
(
    competition_id int              not null,
    user_id        int              not null,
    pass_count     bigint default 0 not null,
    penalty_time   int    default 0 not null,
    name           varchar(50)      not null,
    constraint unique_competition_user
        unique (competition_id, user_id),
    constraint competition_user_ibfk_1
        foreign key (competition_id) references competition (id)
            on update cascade on delete cascade,
    constraint competition_user_ibfk_2
        foreign key (user_id) references user (id)
            on update cascade on delete cascade
);

create index user_id
    on competition_user (user_id);

create table user_role
(
    id          bigint auto_increment comment '主键ID'
        primary key,
    user_id     bigint                             not null comment '用户ID',
    role_id     bigint                             not null comment '角色ID',
    create_time datetime default CURRENT_TIMESTAMP null comment '创建时间',
    constraint uk_user_role
        unique (user_id, role_id)
)
    comment '用户-角色关联表';

create index idx_role_id
    on user_role (role_id);

create index idx_user_id
    on user_role (user_id);

create table user_solved_problem
(
    user_id        int          not null,
    problem_id     bigint       not null,
    competition_id int          not null,
    problem_name   varchar(100) null,
    primary key (user_id, problem_id, competition_id)
);

create index problem_id
    on user_solved_problem (problem_id);

create index user_solved_problem_user_id_index
    on user_solved_problem (user_id);

create table user_tag
(
    id           bigint auto_increment
        primary key,
    pass_count   bigint default 0 null,
    uid          bigint           null,
    tag          varchar(50)      null,
    submit_count bigint default 0 null,
    constraint user_tag_pk
        unique (uid, tag)
);

create index user_tag_uid_index
    on user_tag (uid);

-- =====================================================
-- 初始化角色数据
-- =====================================================
INSERT INTO `role` (`code`, `name`, `description`) VALUES
('SUPER_ADMIN', '超级管理员', '拥有系统所有权限'),
('ADMIN', '管理员', '拥有大部分管理权限'),
('USER', '普通用户', '拥有基本使用权限'),
('GUEST', '游客', '只有查看权限')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- =====================================================
-- 初始化权限数据
-- =====================================================

-- 用户管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('user:view', '查看用户', '查看用户列表和详情', 'user'),
('user:create', '创建用户', '创建新用户', 'user'),
('user:update', '更新用户', '更新用户信息', 'user'),
('user:delete', '删除用户', '删除用户', 'user'),
('user:manage', '管理用户', '用户管理的完整权限', 'user')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 题目管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('problem:view', '查看题目', '查看题目列表和详情', 'problem'),
('problem:create', '创建题目', '创建新题目', 'problem'),
('problem:update', '更新题目', '更新题目信息', 'problem'),
('problem:delete', '删除题目', '删除题目', 'problem'),
('problem:manage', '管理题目', '题目管理的完整权限', 'problem')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 比赛管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('competition:view', '查看比赛', '查看比赛列表和详情', 'competition'),
('competition:create', '创建比赛', '创建新比赛', 'competition'),
('competition:update', '更新比赛', '更新比赛信息', 'competition'),
('competition:delete', '删除比赛', '删除比赛', 'competition'),
('competition:manage', '管理比赛', '比赛管理的完整权限', 'competition')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 练习管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('practice:view', '查看练习', '查看练习列表和详情', 'practice'),
('practice:create', '创建练习', '创建新练习', 'practice'),
('practice:update', '更新练习', '更新练习信息', 'practice'),
('practice:delete', '删除练习', '删除练习', 'practice'),
('practice:manage', '管理练习', '练习管理的完整权限', 'practice')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 提交记录权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('submission:view', '查看提交', '查看自己的提交记录', 'submission'),
('submission:view_all', '查看所有提交', '查看所有用户的提交记录', 'submission'),
('submission:rejudge', '重新评测', '重新评测提交', 'submission'),
('submission:submit', '提交代码', '提交代码进行评测', 'submission')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 题解管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('solve:view', '查看题解', '查看题解', 'solve'),
('solve:create', '创建题解', '创建新题解', 'solve'),
('solve:update', '更新题解', '更新题解', 'solve'),
('solve:delete', '删除题解', '删除题解', 'solve'),
('solve:audit', '审核题解', '审核题解', 'solve')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 标签管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('tag:view', '查看标签', '查看标签列表', 'tag'),
('tag:create', '创建标签', '创建新标签', 'tag'),
('tag:update', '更新标签', '更新标签', 'tag'),
('tag:delete', '删除标签', '删除标签', 'tag')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 通知管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('notification:view', '查看通知', '查看通知', 'notification'),
('notification:create', '创建通知', '创建系统通知', 'notification'),
('notification:delete', '删除通知', '删除通知', 'notification')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 社交功能权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('friend:use', '好友功能', '使用好友功能', 'social'),
('comment:create', '发布评论', '发布评论', 'social'),
('comment:delete', '删除评论', '删除评论', 'social')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- AI配置权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('ai:config_view', '查看AI配置', '查看AI配置', 'ai'),
('ai:config_update', '更新AI配置', '更新AI配置', 'ai'),
('ai:chat', 'AI对话', '使用AI对话功能', 'ai')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 系统管理权限
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('system:settings', '系统设置', '修改系统设置', 'system'),
('system:monitor', '系统监控', '查看系统监控信息', 'system'),
('system:log', '系统日志', '查看系统日志', 'system')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 角色权限管理
INSERT INTO `permission` (`code`, `name`, `description`, `module`) VALUES
('role:view', '查看角色', '查看角色列表', 'role'),
('role:create', '创建角色', '创建新角色', 'role'),
('role:update', '更新角色', '更新角色信息', 'role'),
('role:delete', '删除角色', '删除角色', 'role'),
('permission:assign', '分配权限', '为角色分配权限', 'role')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- =====================================================
-- 初始化角色-权限关联（超级管理员拥有所有权限）
-- =====================================================
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 
    (SELECT id FROM role WHERE code = 'SUPER_ADMIN'),
    id
FROM permission
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- 管理员权限（除了系统设置和角色权限管理）
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 
    (SELECT id FROM role WHERE code = 'ADMIN'),
    id
FROM permission 
WHERE module NOT IN ('system', 'role')
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- 普通用户权限
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 
    (SELECT id FROM role WHERE code = 'USER'),
    id
FROM permission 
WHERE code IN (
    'problem:view', 
    'competition:view', 
    'practice:view', 
    'submission:view',
    'submission:submit',
    'solve:view', 
    'solve:create',
    'tag:view',
    'notification:view',
    'ai:chat',
    'friend:use',
    'comment:create',
    'comment:delete'
)
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- 游客权限
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 
    (SELECT id FROM role WHERE code = 'GUEST'),
    id
FROM permission 
WHERE code IN (
    'problem:view', 
    'competition:view', 
    'solve:view',
    'tag:view'
)
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- =====================================================
-- 初始化标签数据
-- =====================================================
INSERT INTO `tag` (`name`) VALUES
('数组'), ('字符串'), ('哈希表'), ('动态规划'), ('数学'),
('排序'), ('贪心'), ('深度优先搜索'), ('二分查找'), ('广度优先搜索'),
('树'), ('二叉树'), ('链表'), ('图'), ('堆（优先队列）'),
('模拟'), ('回溯'), ('栈'), ('队列'), ('递归'),
('分治'), ('位运算'), ('双指针'), ('滑动窗口'), ('前缀和'),
('并查集'), ('字典树'), ('线段树'), ('单调栈'), ('单调队列')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- =====================================================
-- 为现有用户分配角色（根据identity字段迁移）
-- =====================================================

-- 将SUPER_ADMIN身份的用户关联到超级管理员角色
INSERT INTO `user_role` (`user_id`, `role_id`)
SELECT u.id, r.id
FROM `user` u, `role` r
WHERE u.identity = 'SUPER_ADMIN' AND r.code = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE `user_id` = `user_id`;

-- 将ADMIN身份的用户关联到管理员角色
INSERT INTO `user_role` (`user_id`, `role_id`)
SELECT u.id, r.id
FROM `user` u, `role` r
WHERE u.identity = 'ADMIN' AND r.code = 'ADMIN'
ON DUPLICATE KEY UPDATE `user_id` = `user_id`;

-- 将普通用户关联到USER角色
INSERT INTO `user_role` (`user_id`, `role_id`)
SELECT u.id, r.id
FROM `user` u, `role` r
WHERE (u.identity IS NULL OR u.identity = '' OR u.identity = 'USER') AND r.code = 'USER'
ON DUPLICATE KEY UPDATE `user_id` = `user_id`;

