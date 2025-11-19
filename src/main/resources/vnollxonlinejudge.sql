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
    version        int        default 1 null
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
    memory       int              not null
);

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

