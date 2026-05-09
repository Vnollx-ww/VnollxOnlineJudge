-- ==================== 团队赛：成员只保存报名姓名，不绑定平台账号 ====================
drop procedure if exists drop_team_member_user_binding;

delimiter $$
create procedure drop_team_member_user_binding()
begin
    declare done int default 0;
    declare fk_table varchar(64);
    declare fk_name varchar(64);
    declare fk_cursor cursor for
        select table_name, constraint_name
        from information_schema.referential_constraints
        where constraint_schema = database()
          and referenced_table_name = 'competition_team_member';
    declare continue handler for not found set done = 1;

    open fk_cursor;
    fk_loop: loop
        fetch fk_cursor into fk_table, fk_name;
        if done = 1 then
            leave fk_loop;
        end if;
        set @drop_fk_sql = concat('alter table `', fk_table, '` drop foreign key `', fk_name, '`');
        prepare stmt from @drop_fk_sql;
        execute stmt;
        deallocate prepare stmt;
    end loop;
    close fk_cursor;

    if exists (
        select 1
        from information_schema.table_constraints
        where constraint_schema = database()
          and table_name = 'competition_team_member'
          and constraint_name = 'competition_team_member_ibfk_3'
          and constraint_type = 'FOREIGN KEY'
    ) then
        alter table competition_team_member drop foreign key competition_team_member_ibfk_3;
    end if;

    if not exists (
        select 1
        from information_schema.statistics
        where table_schema = database()
          and table_name = 'competition_team_member'
          and index_name = 'competition_team_member_competition_id_index'
    ) then
        alter table competition_team_member add index competition_team_member_competition_id_index (competition_id);
    end if;

    if exists (
        select 1
        from information_schema.statistics
        where table_schema = database()
          and table_name = 'competition_team_member'
          and index_name = 'unique_competition_team_member'
    ) then
        alter table competition_team_member drop index unique_competition_team_member;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = database()
          and table_name = 'competition_team_member'
          and column_name = 'user_id'
    ) then
        alter table competition_team_member drop column user_id;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = database()
          and table_name = 'competition_team_member'
          and column_name = 'user_name'
    ) then
        alter table competition_team_member drop column user_name;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = database()
          and table_name = 'competition_team'
          and column_name = 'leader_user_id'
    ) then
        alter table competition_team drop column leader_user_id;
    end if;

    if not exists (
        select 1
        from information_schema.statistics
        where table_schema = database()
          and table_name = 'competition_team'
          and index_name = 'unique_competition_team_email'
    ) then
        alter table competition_team add constraint unique_competition_team_email unique (competition_id, email);
    end if;
end $$
delimiter ;

call drop_team_member_user_binding();

drop procedure if exists drop_team_member_user_binding;
