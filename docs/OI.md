# OI 赛制扩展实施计划

为现有比赛系统增加 OI 赛制：题目页「保存」按钮覆盖式存提交，比赛结束后定时器统一评测并按通过数据点求和计分；不走 Redis。

---

## 1. 数据库变更

### `sql/create_tables.sql` & `sql/update_tables.sql`
- `competition` 增加列：
  - `rule VARCHAR(8) DEFAULT 'ACM' NOT NULL` — 取值 `ACM` / `OI`，默认 `ACM`，向后兼容历史比赛。
  - `is_settled TINYINT(1) DEFAULT 0 NOT NULL` — 仅 OI 用，标记定时器是否已把本场所有 submission 入队评测，幂等关键。
- `submission` 增加索引：`CREATE INDEX submission_cid_uid_pid_index ON submission (cid, uid, pid);` — 加速 OI 保存时按 (cid,uid,pid) 查找已有记录。
- 新增 dict 数据：`('JUDGE_RESULT_STATUS', '已保存', '已保存', 12, 'default', 'default', 0, 1, 'OI 赛制保存但未评测')`。

> 说明：不在 `submission` 加 unique key，避免影响 ACM 多次提交；OI 单条记录由服务层强制。

---

## 2. 后端实体 / DTO / VO

### `Competition` 实体
- 增加 `private String rule;`（`@Column("rule")`）
- 增加 `private Boolean isSettled;`（`@Column("is_settled")`）

### `CompetitionVo`
- 增加 `rule` / `isSettled` 字段并在构造函数中赋值。

### `AdminSaveCompetitionDTO`
- 增加 `private String rule;`

### `CompetitionService` / `CompetitionServiceImpl`
- `createCompetition` / `updateCompetition` 签名增加 `String rule`，新增 `normalizeRule()`：`OI` 大写匹配返回 `OI`，否则 `ACM`。新建时 `isSettled=false`。
- `judgeIsOpenById`：OI 与 ACM 共用，仍然要求当前时间在 [begin, end] 内才允许「保存」（结束后只读）。

### `AdminCompetitionController`
- `createCompetition` / `updateCompetition` 透传 `req.getRule()`。

### `JudgeInfo` 实体
- 新增 `private Boolean oiSettlement;`，由 OI 结算定时器投递时置为 `true`，正常 ACM 提交置为 `null`/`false`。Consumer 据此区分聚合路径。

---

## 3. 提交流程：`JudgeServiceImpl.judgeSubmission`

伪代码骨架：

```
if (cid > 0) {
  competition = competitionService.getCompetitionById(cid);
  judgeIsOpenById(now, cid);
  if (hasFinishedCompetition(cid, uid)) throw ...;
  teamId = resolveTeamId(...);
  if ("OI".equalsIgnoreCase(competition.getRule())) {
    return saveOiSubmission(req, uid, teamId, competition);
  }
}
// 现有 ACM / 普通题路径不变
```

### `saveOiSubmission`
1. 根据 (cid, pid, uid) 个人赛 / (cid, pid, teamId) 团队赛 查询 `submission`：
   - 找到 → 用同一 id 与原有 snowflakeId，覆盖 `code/language/createTime/status='已保存'`，并清理 `time/memory/errorInfo/passCount/testCount/queueAhead`。
   - 未找到 → 新建一条，status='已保存'，分配新的 snowflakeId。
2. 个人赛同步 `competitionUserService.createRecord(cid, uid, userName)`（幂等），保证排行榜行存在；团队赛行已在导入时建立。
3. 不调用 `JudgeProducer.sendJudge`，不写 Redis。
4. 返回 `JudgeResultVO{ snowflakeId, status='已保存', description='代码已保存，比赛结束后将统一评测' }`。

### `SubmissionService` 新增方法
```java
Submission findOiSubmission(Long cid, Long pid, Long uid, Long teamId);
void upsertOiSubmission(Submission submission); // 内部按是否有 id 走 update / save
```
- `addSubmission` 中现有「等待评测」的 queueAhead 快照逻辑保持不变；OI 写入 status='已保存'，不会触发该分支。

---

## 4. OI 比赛结算定时器

新增 `scheduler/OiCompetitionSettlementScheduler.java`：
- `@Scheduled(fixedRate = 60_000, initialDelay = 30_000)`
- 流程：
  1. 查询所有 `rule='OI' AND is_settled=0 AND end_time <= now` 的比赛。
  2. 对每场比赛事务内：
     - 用 `update ... set is_settled=1 where id=? and is_settled=0` CAS 抢锁，受影响行=0 跳过（避免多实例并发结算）。
     - 查询本场所有 `status='已保存'` 的 submission，逐条：
       - `submissionService.updateStatusBySnowflake(sid, '等待评测', null...)` 让前端列表展示中间态。
       - 构造 `JudgeInfo`（含 cid/pid/uid/teamId/code/language/...，并 `oiSettlement=true`）。
       - `judgeProducer.sendJudge(priority=1, judgeInfo)` 入 MQ。
- 不删除/重置 `is_settled`，重试需人工干预（与「定时器自动触发」需求匹配）。

---

## 5. 评测结果聚合：`JudgeConsumer`

`handleSubmission` 在拿到 `RunResult` 后：
- 仍然写入 submission 行的状态/时间/内存等结果（OI 期望保留 passCount/testCount，**不要**像 ACM 那样把它们置 null）。
- 如果 `judgeInfo.getCid() > 0` 且 `judgeInfo.getOiSettlement() == true`：
  - 调用新方法 `submissionService.applyOiResult(judgeInfo, result)`：
    - 更新该条 submission 的 `status / time / memory / passCount / testCount / errorInfo`（OI 全保留）。
    - 不调 `processSubmission`、不写 Redis。
- 否则（普通 ACM）：维持现状。

新增 `submissionService.recomputeOiCompetitionStats(Long cid)`：
- 在每次 OI submission 评测完后或定时器收尾时调用一次（更稳妥：在 consumer 里每条评测完后调 `recomputeOiCompetitionStats(cid)` 做覆盖式聚合，幂等）。
- 实现：以 cid 为粒度做一次性聚合 SQL：
  - `competition_problem.submit_count` = 该题在本场 submission 中行数（已保存或已评测都算 1 条）；`pass_count` = `passCount==testCount AND status='答案正确'` 的行数。
  - `competition_user.pass_count` = `Σ submission.passCount`（按 uid / 队长 uid 分组），`penalty_time` 置 0。
  - 个人赛按 `submission.uid`，团队赛通过 `team_id → competition_team.email → user.id` 映射到队长账号（参照 Team Memory 规则；现有 `competition_user` 已是队长账号维度）。

> 选择「每条评测完都聚合」而非「等所有完成后再聚合」，是为了避免引入异步完成检测；MySQL 写入压力可接受（每场 OI 通常 < 数百条 submission）。

---

## 6. 排行榜显示

### `CompetitionServiceImpl.getRanklist`
- 在方法开头判断 `competition.getRule()`：
  - `ACM`：现有逻辑。
  - `OI`：
    - 不再统计 `wrongCount` / `solveMinutes` / 罚时；忽略首杀（无 firstSolve 概念）。
    - 每个 (user/team, problem) 的得分 = 该 (cid,pid,uid|teamId) 上唯一 submission 的 `passCount`（无记录则 0）。
    - `ProblemResultVo` 复用 `solveMinutes`/`solved` 字段表达：
      - `solved = (passCount == testCount && testCount > 0)`
      - 新增字段 `Integer score` 与 `Integer maxScore`（即 testCount），前端显示「60/100」格式。
    - `UserRankVo.passCount` 改语义为「总得分」，`penaltyTime` 恒 0；按总得分降序排序。

### `CompetitionRanklistVo.ProblemResultVo`
- 增加 `private Integer score; private Integer maxScore;`

### 前端 `frontend/src/app/competition/[id]/ranklist/page.tsx`
- 读取 `competition.rule`：
  - OI：表头去掉「罚时」列；每题单元格展示 `score/maxScore`；总分列复用 `passCount`。
  - ACM：保持现状。

---

## 7. 前端类型与表单

### 通用类型
- `Competition` interface（`useAdminCompetitions.ts`、`useCompetitionDetail.ts`、`useCompetitionProblemDetail.ts`）增加 `rule?: 'ACM' | 'OI' | string;` 与 `isSettled?: boolean;`。

### 管理后台 `frontend/src/app/admin/AdminCompetitions.tsx` + `useAdminCompetitions.ts`
- 表单增加「赛制」`Select`：选项 `ACM` / `OI`，默认 `ACM`。
- `defaultCompetitionForm` / `editCompetition` / 提交体均带上 `rule`。
- 列表新增「赛制」列（`Tag`，`OI` 用 `gold`，`ACM` 用 `blue`）。

### 题目页 `useCompetitionProblemDetail.ts` + `frontend/src/app/competition/[cid]/problem/[id]/page.tsx`
- `useCompetitionProblemDetail`：
  - 暴露 `isOiCompetition = competition?.rule === 'OI'`。
  - 进入题目页时，如果 `isOiCompetition`：调用一个新接口 `submissionApi.getMyOiSubmission(cid, pid)`（GET 返回 `{code, language}`），优先用其填入编辑器（覆盖 localStorage）。后端方法新增到 `SubmissionController`，鉴权后按当前用户 uid（团队赛取 teamId）查询返回 `{code, language}`，找不到返回空。
  - `handleSubmitCode` 不变（同一个 `judgeApi.submit`），但 OI 下不订阅 WebSocket 评测进度——即便订阅也收不到消息；toast/runResult 显示「已保存」。
  - 比赛已结束（`isCompetitionEnd=true`）时：OI 仍允许查看 ranklist，编辑器只读，按钮禁用。
- 页面 `page.tsx`：
  - `primaryAction` 文案：OI = 「保存」 / 「保存中...」；ACM = 「保存并提交」（保持现状）。
  - 进度区域提示文本根据 `isOiCompetition` 切换为「代码已保存，比赛结束后将统一评测」。
  - 屏蔽 OI 期间「本题我的提交记录」抽屉中的状态/时间/内存列空值显示，加 fallback：状态显示「已保存（待评测）」。

### 普通非比赛题目页 `useProblemDetail.ts`
- **不动**，普通题目永远是「保存并提交」并立即评测。

---

## 8. 测试 / 验证步骤

1. 运行 `update_tables.sql` 增量补字段与 dict 行。
2. 后端编译 `mvn -q -DskipTests package`，重启。
3. 前端 `npm run build`。
4. 手动验证：
   - 创建一场 OI 比赛（个人赛、团队赛各一场），开始时间 T-1min，结束 T+5min。
   - 普通用户进入题目页：按钮显示「保存」，点击后 toast「已保存」；DB `submission` 行 status='已保存'。
   - 再次保存：同一行 id 不变，code/createTime 更新；DB 没有新增行。
   - 等到 end_time 之后 1~2 分钟：`competition.is_settled` 变 1；submission 状态依次切到「评测中」→ 最终结果；`competition_user.pass_count` 与 `competition_problem.pass_count/submit_count` 与 submission 聚合一致。
   - 排行榜按 OI 分数降序；每题展示 `passCount/testCount`。
   - 同时再创建一场 ACM 比赛，验证按钮文案、评测、Redis 排行榜逻辑均未受影响。

## 9. 兼容与回滚

- `rule` 默认 `ACM`，全部历史比赛迁移后保持原行为，无回归风险。
- 若 OI 结算异常需要重跑：手动 SQL `update competition set is_settled=0 where id=?; update submission set status='已保存', time=null, memory=null, pass_count=null, test_count=null where cid=? and status<>'已保存';`，等待下一轮定时器。
- 本次不引入新的 Redis key、不破坏现有 ACM 的 Redis 流程。
