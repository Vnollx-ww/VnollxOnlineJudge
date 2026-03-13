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

create table problem_example
(
    id            bigint auto_increment comment '样例ID'
        primary key,
    problem_id    bigint        not null comment '题目ID',
    input         text          null comment '输入样例',
    output        text          null comment '输出样例',
    sort_order    int default 0 null comment '排序序号',
    is_public     tinyint(1) default 1 null comment '是否公开',
    create_time   datetime default CURRENT_TIMESTAMP null comment '创建时间',
    update_time   datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint fk_problem_example_problem_id
        foreign key (problem_id) references problem (id)
            on delete cascade
)
    comment '题目样例表' collate = utf8mb4_unicode_ci;

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

-- -----------------------------------------------------
-- AI 平台表（SDK/适配器类型：openai、mistral、dashscope 等）
-- -----------------------------------------------------
create table ai_platform
(
    id          bigint auto_increment comment '平台ID'
        primary key,
    code        varchar(50)                         not null comment '平台编码: langchain4j | zhipu',
    name        varchar(100)                        not null comment '平台显示名称',
    description varchar(256)                        null comment '说明',
    sort_order  int default 0                      null comment '排序序号',
    status      tinyint default 1                    null comment '状态：1-启用，0-禁用',
    create_time datetime default CURRENT_TIMESTAMP  null comment '创建时间',
    update_time datetime default CURRENT_TIMESTAMP  null on update CURRENT_TIMESTAMP comment '更新时间',
    unique key uk_ai_platform_code (code),
    index idx_ai_platform_status (status)
) comment 'AI 平台表(区分 SDK：langchain4j 或智谱原生)' collate = utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- AI 模型表、用户对话记录表
-- -----------------------------------------------------
create table ai_model
(
    id              bigint auto_increment comment '模型ID'
        primary key,
    platform_id     bigint                              not null comment '所属平台ID(关联 ai_platform)',
    adapter_code    varchar(50)                         null comment '平台=langchain4j 时必填: openai/mistral/dashscope',
    name            varchar(100)                        not null comment '模型显示名称',
    model_id        varchar(100)                        not null comment '模型标识(如 gpt-4、glm-4.7)',
    logo_url        varchar(512)                        null comment '模型 Logo 图片地址',
    endpoint        varchar(512)                        null comment 'API 请求地址(仅 langchain4j 部分适配器可填)',
    api_key         varchar(512)                        null comment 'API 密钥(加密存储)',
    max_tokens      int default 4096                    null comment '单次最大 token 数',
    temperature     decimal(3, 2) default 0.70          null comment '温度参数 0-2',
    timeout_seconds int default 60                      null comment '请求超时秒数',
    extra_config    json                                null comment '扩展配置(JSON)',
    sort_order      int default 0                      null comment '排序序号',
    status          tinyint default 1                   null comment '状态：1-启用，0-禁用',
    create_time     datetime default CURRENT_TIMESTAMP  null comment '创建时间',
    update_time     datetime default CURRENT_TIMESTAMP  null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint fk_ai_model_platform foreign key (platform_id) references ai_platform (id) on delete restrict,
    index idx_ai_model_platform (platform_id),
    index idx_model_id (model_id),
    index idx_status (status),
    index idx_sort_order (sort_order)
) comment 'AI 模型配置表' collate = utf8mb4_unicode_ci;

create table ai_chat_record
(
    id               bigint auto_increment comment '记录ID'
        primary key,
    user_id          int                                 not null comment '用户ID',
    model_id         bigint                              not null comment '使用的AI模型ID',
    session_id       varchar(64)                         null comment '会话ID(多轮对话分组)',
    user_message     text                                not null comment '用户提问内容',
    model_reply      text                                null comment '模型回答内容',
    thinking_content text                                null comment '思考过程内容（如智谱 reasoning）',
    prompt_tokens    int                                 null comment '请求消耗 token 数',
    completion_tokens int                               null comment '回答消耗 token 数',
    total_tokens     int                                 null comment '总 token 数',
    latency_ms       int                                 null comment '响应耗时(毫秒)',
    status           varchar(20) default 'success'      null comment '状态：success/fail/timeout/error',
    error_message    text                                null comment '失败时的错误信息',
    create_time      datetime default CURRENT_TIMESTAMP  null comment '提问时间',
    reply_time       datetime                            null comment '回答完成时间',
    constraint fk_ai_chat_record_user
        foreign key (user_id) references user (id) on delete cascade,
    constraint fk_ai_chat_record_model
        foreign key (model_id) references ai_model (id) on delete restrict,
    index idx_user_id (user_id),
    index idx_model_id (model_id),
    index idx_session_id (session_id),
    index idx_create_time (create_time),
    index idx_user_create (user_id, create_time)
) comment '用户AI对话记录表' collate = utf8mb4_unicode_ci;

-- =====================================================
-- 初始化角色数据（id 从 1 开始）
-- =====================================================
INSERT INTO `role` (`id`, `code`, `name`, `description`) VALUES
(1, 'SUPER_ADMIN', '超级管理员', '拥有系统所有权限'),
(2, 'ADMIN', '管理员', '拥有大部分管理权限'),
(3, 'USER', '普通用户', '拥有基本使用权限'),
(4, 'GUEST', '游客', '只有查看权限'),
(5, 'TEACHER', '教师', '教师角色，可管理题目/比赛/练习、查看学生提交与数据统计');

-- =====================================================
-- 初始化权限数据（id 从 1 开始，1-5 用户 6-10 题目 11-15 比赛 16-20 练习 21-24 提交 25-29 题解 30-33 标签 34-36 通知 37-39 社交 40-42 AI 43-45 系统 46-50 角色）
-- =====================================================
INSERT INTO `permission` (`id`, `code`, `name`, `description`, `module`) VALUES
(1, 'user:view', '查看用户', '查看用户列表和详情', 'user'),
(2, 'user:create', '创建用户', '创建新用户', 'user'),
(3, 'user:update', '更新用户', '更新用户信息', 'user'),
(4, 'user:delete', '删除用户', '删除用户', 'user'),
(5, 'user:manage', '管理用户', '用户管理的完整权限', 'user'),
(6, 'problem:view', '查看题目', '查看题目列表和详情', 'problem'),
(7, 'problem:create', '创建题目', '创建新题目', 'problem'),
(8, 'problem:update', '更新题目', '更新题目信息', 'problem'),
(9, 'problem:delete', '删除题目', '删除题目', 'problem'),
(10, 'problem:manage', '管理题目', '题目管理的完整权限', 'problem'),
(11, 'competition:view', '查看比赛', '查看比赛列表和详情', 'competition'),
(12, 'competition:create', '创建比赛', '创建新比赛', 'competition'),
(13, 'competition:update', '更新比赛', '更新比赛信息', 'competition'),
(14, 'competition:delete', '删除比赛', '删除比赛', 'competition'),
(15, 'competition:manage', '管理比赛', '比赛管理的完整权限', 'competition'),
(16, 'practice:view', '查看练习', '查看练习列表和详情', 'practice'),
(17, 'practice:create', '创建练习', '创建新练习', 'practice'),
(18, 'practice:update', '更新练习', '更新练习信息', 'practice'),
(19, 'practice:delete', '删除练习', '删除练习', 'practice'),
(20, 'practice:manage', '管理练习', '练习管理的完整权限', 'practice'),
(21, 'submission:view', '查看提交', '查看自己的提交记录', 'submission'),
(22, 'submission:view_all', '查看所有提交', '查看所有用户的提交记录', 'submission'),
(23, 'submission:rejudge', '重新评测', '重新评测提交', 'submission'),
(24, 'submission:submit', '提交代码', '提交代码进行评测', 'submission'),
(25, 'solve:view', '查看题解', '查看题解', 'solve'),
(26, 'solve:create', '创建题解', '创建新题解', 'solve'),
(27, 'solve:update', '更新题解', '更新题解', 'solve'),
(28, 'solve:delete', '删除题解', '删除题解', 'solve'),
(29, 'solve:audit', '审核题解', '审核题解', 'solve'),
(30, 'tag:view', '查看标签', '查看标签列表', 'tag'),
(31, 'tag:create', '创建标签', '创建新标签', 'tag'),
(32, 'tag:update', '更新标签', '更新标签', 'tag'),
(33, 'tag:delete', '删除标签', '删除标签', 'tag'),
(34, 'notification:view', '查看通知', '查看通知', 'notification'),
(35, 'notification:create', '创建通知', '创建系统通知', 'notification'),
(36, 'notification:delete', '删除通知', '删除通知', 'notification'),
(37, 'friend:use', '好友功能', '使用好友功能', 'social'),
(38, 'comment:create', '发布评论', '发布评论', 'social'),
(39, 'comment:delete', '删除评论', '删除评论', 'social'),
(40, 'ai:config_view', '查看AI配置', '查看AI配置', 'ai'),
(41, 'ai:config_update', '更新AI配置', '更新AI配置', 'ai'),
(42, 'ai:chat', 'AI对话', '使用AI对话功能', 'ai'),
(43, 'system:settings', '系统设置', '修改系统设置', 'system'),
(44, 'system:monitor', '系统监控', '查看系统监控信息', 'system'),
(45, 'system:log', '系统日志', '查看系统日志', 'system'),
(46, 'role:view', '查看角色', '查看角色列表', 'role'),
(47, 'role:create', '创建角色', '创建新角色', 'role'),
(48, 'role:update', '更新角色', '更新角色信息', 'role'),
(49, 'role:delete', '删除角色', '删除角色', 'role'),
(50, 'permission:assign', '分配权限', '为角色分配权限', 'role');

-- =====================================================
-- 初始化角色-权限关联（仅 role_id、permission_id 数字）
-- 1=超级管理员 全量 1-50；2=管理员 1-42；3=用户 指定；4=游客 指定；5=教师 指定
-- =====================================================
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 1, n FROM (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
    UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
    UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
    UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35 UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40
    UNION SELECT 41 UNION SELECT 42 UNION SELECT 43 UNION SELECT 44 UNION SELECT 45 UNION SELECT 46 UNION SELECT 47 UNION SELECT 48 UNION SELECT 49 UNION SELECT 50) t;
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT 2, n FROM (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
    UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
    UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
    UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35 UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40
    UNION SELECT 41 UNION SELECT 42) t;
INSERT INTO `role_permission` (`role_id`, `permission_id`) VALUES
(3, 6), (3, 11), (3, 16), (3, 21), (3, 24), (3, 25), (3, 26), (3, 30), (3, 34), (3, 37), (3, 38), (3, 39), (3, 41);
INSERT INTO `role_permission` (`role_id`, `permission_id`) VALUES
(4, 6), (4, 11), (4, 25), (4, 30);
INSERT INTO `role_permission` (`role_id`, `permission_id`) VALUES
(5, 6), (5, 7), (5, 8), (5, 9), (5, 10), (5, 11), (5, 12), (5, 13), (5, 14), (5, 15), (5, 16), (5, 17), (5, 18), (5, 19), (5, 20),
(5, 21), (5, 22), (5, 23), (5, 24), (5, 25), (5, 26), (5, 27), (5, 28), (5, 29), (5, 30), (5, 31), (5, 32), (5, 33), (5, 34), (5, 35), (5, 36),
(5, 37), (5, 38), (5, 39), (5, 41), (5, 44), (5, 46);

-- =====================================================
-- 初始化标签数据（id 从 1 开始）
-- =====================================================
INSERT INTO `tag` (`id`, `name`) VALUES
(1, '数组'), (2, '字符串'), (3, '哈希表'), (4, '动态规划'), (5, '数学'),
(6, '排序'), (7, '贪心'), (8, '深度优先搜索'), (9, '二分查找'), (10, '广度优先搜索'),
(11, '树'), (12, '二叉树'), (13, '链表'), (14, '图'), (15, '堆（优先队列）'),
(16, '模拟'), (17, '回溯'), (18, '栈'), (19, '队列'), (20, '递归'),
(21, '分治'), (22, '位运算'), (23, '双指针'), (24, '滑动窗口'), (25, '前缀和'),
(26, '并查集'), (27, '字典树'), (28, '线段树'), (29, '单调栈'), (30, '单调队列');

-- =====================================================
-- 初始化 AI 平台（仅两种 SDK：langchain4j、zhipu）
-- =====================================================
INSERT INTO ai_platform (id, code, name, description, sort_order, status) VALUES
(1, 'langchain4j', 'LangChain4j', 'OpenAI / Mistral / 阿里云百炼 等，统一走 LangChain4j', 0, 1),
(2, 'zhipu', '智谱 AI', '智谱开放平台，直接使用 zai-sdk 调用', 1, 1);

-- =====================================================
-- 初始化 AI 模型（示例：LangChain4j-Mistral + 智谱 GLM-4.7）
-- =====================================================
INSERT INTO ai_model (id, platform_id, adapter_code, name, model_id, logo_url, endpoint, api_key, max_tokens, temperature, timeout_seconds, sort_order, status)
VALUES
(1, 1, 'mistral', 'Mistral Large', 'mistral-large-latest', NULL, 'https://api.mistral.ai', '', 4096, 0.70, 60, 0, 1),
(2, 2, NULL, '智谱 GLM-4.7', 'glm-4.7', NULL, NULL, 'your-zhipu-api-key', 8192, 0.70, 60, 1, 0);
