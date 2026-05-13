UPDATE submission
SET create_time = DATE_FORMAT(
        DATE_ADD(STR_TO_DATE(create_time, '%Y-%m-%d %H:%i:%s'), INTERVAL 24 MINUTE),
        '%Y-%m-%d %H:%i:%s'
                  )
WHERE cid = 9
  AND user_name IN (
                    '许浩林',
                    '苏麟',
                    '吴廷宇',
                    '张益涵',
                    '彭伟雄',
                    '夏禹',
                    '徐帆',
                    '钱奕帆',
                    '刘沿',
                    '刘樱'
    );