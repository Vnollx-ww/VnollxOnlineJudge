alter table problem
    add column float_tolerance double null comment '浮点误差容忍值' after checker_file;

alter table competition_problem
    add column problem_order int default 0 null comment '比赛内题目顺序' after pass_count;

set @row_num := 0;
set @current_competition_id := null;

update competition_problem cp
    join (
        select id,
               @row_num := if(@current_competition_id = competition_id, @row_num + 1, 1) as row_num,
               @current_competition_id := competition_id
        from competition_problem
        order by competition_id, id
    ) ordered on cp.id = ordered.id
set cp.problem_order = ordered.row_num
where cp.problem_order is null or cp.problem_order = 0;