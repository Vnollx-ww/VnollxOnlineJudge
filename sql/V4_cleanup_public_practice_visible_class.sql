-- 数据修复：公开练习不应保留 practice_visible_class 关联（与业务「公开与班级互斥」一致）
-- 执行前请备份；可在升级或手工运维时执行一次。

DELETE pvc
FROM practice_visible_class AS pvc
         INNER JOIN practice AS p ON p.id = pvc.practice_id
WHERE p.is_public = 1;
