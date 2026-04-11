-- 班级管理相关表结构
-- 适用于全新安装或增量升级

-- 班级表
CREATE TABLE IF NOT EXISTS student_class
(
    id          bigint auto_increment comment '班级ID'
        primary key,
    class_name  varchar(100)                       not null comment '班级名称',
    teacher_id  int                                not null comment '教师ID',
    create_time varchar(50)                        null comment '创建时间',
    constraint uk_class_teacher unique (class_name, teacher_id)
)
    comment '班级表';

CREATE INDEX idx_teacher_id ON student_class (teacher_id);

-- 班级-学生关联表（一个学生只能属于一个班级）
CREATE TABLE IF NOT EXISTS student_class_relation
(
    id         bigint auto_increment comment '主键ID'
        primary key,
    class_id   bigint not null comment '班级ID',
    student_id int    not null comment '学生ID',
    constraint uk_student_class unique (student_id),
    constraint fk_scr_class foreign key (class_id) references student_class (id) on delete cascade,
    constraint fk_scr_student foreign key (student_id) references user (id) on delete cascade
)
    comment '班级学生关联表';

CREATE INDEX idx_class_id ON student_class_relation (class_id);
CREATE INDEX idx_student_id ON student_class_relation (student_id);

-- 练习-可见班级关联表（私有练习对指定班级可见）
CREATE TABLE IF NOT EXISTS practice_visible_class
(
    id          bigint auto_increment comment '主键ID'
        primary key,
    practice_id bigint not null comment '练习ID',
    class_id    bigint not null comment '班级ID',
    constraint uk_practice_class unique (practice_id, class_id),
    constraint fk_pvc_practice foreign key (practice_id) references practice (id) on delete cascade,
    constraint fk_pvc_class foreign key (class_id) references student_class (id) on delete cascade
)
    comment '练习可见班级关联表';

CREATE INDEX idx_practice_id ON practice_visible_class (practice_id);
CREATE INDEX idx_class_id_visible ON practice_visible_class (class_id);

-- 初始化班级管理权限数据（ID 51-55）
INSERT IGNORE INTO permission (id, code, name, description, module) VALUES
(51, 'class:view', '查看班级', '查看班级列表及详情', 'class'),
(52, 'class:create', '创建班级', '创建新班级', 'class'),
(53, 'class:update', '更新班级', '编辑班级信息/分配学生', 'class'),
(54, 'class:delete', '删除班级', '删除班级', 'class'),
(55, 'class:manage', '班级管理', '班级管理所有权限', 'class');
