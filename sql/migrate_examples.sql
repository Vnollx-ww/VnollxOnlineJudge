-- =====================================================
-- 数据迁移脚本：创建problem_example表并迁移样例数据
-- 执行时间：建议在系统维护期间执行
-- =====================================================

-- 开启事务
START TRANSACTION;

-- 创建problem_example表
CREATE TABLE IF NOT EXISTS problem_example (
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
            on delete cascade,
    index idx_problem_id (problem_id),
    index idx_sort_order (sort_order),
    index idx_is_public (is_public)
) comment '题目样例表' collate = utf8mb4_unicode_ci;

-- 创建临时表存储解析后的样例数据
CREATE TEMPORARY TABLE temp_examples (
    problem_id BIGINT,
    input_example TEXT,
    output_example TEXT,
    sort_order INT DEFAULT 0
);

-- 解析单组样例数据（不包含分隔符的情况）
INSERT INTO temp_examples (problem_id, input_example, output_example, sort_order)
SELECT
    id,
    TRIM(input_example),
    TRIM(output_example),
    0
FROM problem
WHERE input_example IS NOT NULL
  AND input_example != ''
  AND output_example IS NOT NULL
  AND output_example != ''
  AND (input_example NOT LIKE '%|||%' AND output_example NOT LIKE '%|||%');

-- 解析多组样例数据（包含|||分隔符的情况）
INSERT INTO temp_examples (problem_id, input_example, output_example, sort_order)
SELECT
    p.id,
    TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.input_example, '|||', numbers.n), '|||', -1)),
    TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.output_example, '|||', numbers.n), '|||', -1)),
    numbers.n - 1
FROM problem p
CROSS JOIN (
    SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
    UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
) numbers
WHERE p.input_example IS NOT NULL
  AND p.input_example != ''
  AND p.output_example IS NOT NULL
  AND p.output_example != ''
  AND (p.input_example LIKE '%|||%' OR p.output_example LIKE '%|||%')
  AND numbers.n <= (LENGTH(p.input_example) - LENGTH(REPLACE(p.input_example, '|||', '')) + 1);

-- 处理JSON格式的样例数据（如果存在）
-- 注意：这个处理比较复杂，需要根据实际数据格式调整
INSERT INTO temp_examples (problem_id, input_example, output_example, sort_order)
SELECT
    id,
    TRIM(JSON_UNQUOTE(JSON_EXTRACT(input_example, CONCAT('$[', numbers.n, '].input')))),
    TRIM(JSON_UNQUOTE(JSON_EXTRACT(output_example, CONCAT('$[', numbers.n, '].output')))),
    numbers.n
FROM problem p
CROSS JOIN (
    SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
) numbers
WHERE (input_example LIKE '[%' OR output_example LIKE '[%')
  AND JSON_VALID(input_example)
  AND JSON_VALID(output_example)
  AND numbers.n < JSON_LENGTH(input_example)
  AND numbers.n < JSON_LENGTH(output_example);

-- 清理临时表中的空数据
DELETE FROM temp_examples
WHERE input_example IS NULL
   OR input_example = ''
   OR output_example IS NULL
   OR output_example = '';

-- 将解析后的数据插入到problem_example表
INSERT INTO problem_example (
    problem_id,
    input,
    output,
    sort_order,
    is_public,
    create_time,
    update_time
)
SELECT
    problem_id,
    input_example,
    output_example,
    sort_order,
    1, -- 默认公开
    NOW(),
    NOW()
FROM temp_examples
ORDER BY problem_id, sort_order;

-- 验证迁移结果
SELECT
    p.id,
    p.title,
    COUNT(pe.id) as example_count,
    GROUP_CONCAT(CONCAT('Input: ', LEFT(pe.input, 50), '...') SEPARATOR '; ') as sample_inputs
FROM problem p
LEFT JOIN problem_example pe ON p.id = pe.problem_id
WHERE p.input_example IS NOT NULL AND p.input_example != ''
GROUP BY p.id, p.title
ORDER BY p.id;

-- 统计迁移结果
SELECT
    '迁移统计' as info,
    COUNT(DISTINCT problem_id) as problems_migrated,
    COUNT(*) as total_examples
FROM temp_examples;

-- 清理临时表
DROP TEMPORARY TABLE temp_examples;

-- 提交事务
COMMIT;

-- =====================================================
-- 迁移完成后，可以考虑删除或备份原字段
-- ALTER TABLE problem DROP COLUMN input_example;
-- ALTER TABLE problem DROP COLUMN output_example;
-- =====================================================
