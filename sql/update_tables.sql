alter table problem
    add column judge_mode varchar(20) default 'standard' null after datazip,
    add column checker_file varchar(255) null after judge_mode;
