create table competitions
(
    id            int auto_increment
        primary key,
    title         varchar(255)  not null,
    description   text          null,
    begin_time    varchar(100)  not null,
    end_time      varchar(100)  not null,
    password      varchar(255)  null,
    status        varchar(20)   not null,
    need_password tinyint(1)    null,
    number        int default 0 null
);

create table problems
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
    open           tinyint(1) default 0 null
);

create table competition_problems
(
    id             int auto_increment
        primary key,
    problem_id     bigint        not null,
    competition_id int           not null,
    submit_count   int default 0 null,
    pass_count     int default 0 null,
    constraint problem_id
        unique (problem_id, competition_id),
    constraint competition_problems_ibfk_1
        foreign key (problem_id) references problems (id),
    constraint competition_problems_ibfk_2
        foreign key (competition_id) references competitions (id)
);

create index competition_id
    on competition_problems (competition_id);

create table solves
(
    id           int auto_increment
        primary key,
    content      text        null,
    uid          bigint      null,
    pid          bigint      null,
    create_time  varchar(50) null,
    name         varchar(50) null,
    problem_name varchar(50) null,
    title        text        not null
);

create table submissions
(
    id           bigint auto_increment comment 'ID'
        primary key,
    user_name    varchar(50)      not null,
    status       text             not null comment 'Pending, Accepted, WrongAnswer',
    create_time  varchar(50)      not null comment 'YYYY-MM-DD HH:mm:ss',
    language     varchar(20)      not null comment 'C++, Java, Python',
    pid          bigint           not null comment 'ID',
    time         int              null,
    uid          bigint           null,
    problem_name varchar(255)     null,
    code         text             null,
    cid          bigint default 0 null
);

create table tags
(
    id   bigint auto_increment
        primary key,
    name varchar(50) not null,
    constraint name
        unique (name)
);

create table problem_tags
(
    problem_id  bigint       not null,
    create_time varchar(255) null,
    tag_name    varchar(50)  not null,
    constraint idx_problem_tag
        unique (problem_id, tag_name),
    constraint fk_problem_tags_tag_name
        foreign key (tag_name) references tags (name),
    constraint problem_tags_ibfk_1
        foreign key (problem_id) references problems (id)
            on delete cascade
);

create index idx_problem_id
    on problem_tags (problem_id);

create table user_solved_problems
(
    user_id        int    not null,
    problem_id     bigint not null,
    competition_id int    not null,
    primary key (user_id, problem_id, competition_id)
);

create index problem_id
    on user_solved_problems (problem_id);

create table users
(
    id           int auto_increment
        primary key,
    name         varchar(255)  not null,
    password     varchar(255)  not null,
    email        varchar(255)  not null,
    submit_count int           null,
    pass_count   int           null,
    penalty_time int default 0 null,
    constraint email
        unique (email)
);

create table competition_users
(
    competition_id int              not null,
    user_id        int              not null,
    pass_count     bigint default 0 not null,
    penalty_time   int    default 0 not null,
    name           varchar(50)      not null,
    constraint unique_competition_user
        unique (competition_id, user_id),
    constraint competition_users_ibfk_1
        foreign key (competition_id) references competitions (id)
            on update cascade on delete cascade,
    constraint competition_users_ibfk_2
        foreign key (user_id) references users (id)
            on update cascade on delete cascade
);

create index user_id
    on competition_users (user_id);

