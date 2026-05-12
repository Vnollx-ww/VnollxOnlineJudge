package com.example.vnollxonlinejudge.scheduler;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.vnollxonlinejudge.model.entity.Competition;
import com.example.vnollxonlinejudge.model.entity.CompetitionProblem;
import com.example.vnollxonlinejudge.mapper.CompetitionMapper;
import com.example.vnollxonlinejudge.service.CompetitionProblemService;
import com.example.vnollxonlinejudge.service.CompetitionUserService;
import com.example.vnollxonlinejudge.service.RedisService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

/**
 * 比赛数据定时同步任务
 * 每 5 分钟将进行中的比赛的 Redis 统计数据同步到 MySQL
 * 用于在 Redis 缓存丢失（如重启、被清空）时，从数据库恢复比赛题目统计数据
 */
@Component
public class CompetitionDataSyncScheduler {
    private static final Logger logger = LoggerFactory.getLogger(CompetitionDataSyncScheduler.class);

    private static final String PROBLEM_PASS_KEY = "competition_problem_pass:%d:%d";
    private static final String PROBLEM_SUBMIT_KEY = "competition_problem_submit:%d:%d";
    private static final String USER_PASS_COUNT_KEY = "competition_user_pass:%d:%s";
    private static final String USER_PENALTY_KEY = "competition_user_penalty:%d:%s";
    private static final String RANKING_KEY = "competition_ranking:%d";
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final CompetitionMapper competitionMapper;
    private final CompetitionProblemService competitionProblemService;
    private final CompetitionUserService competitionUserService;
    private final RedisService redisService;

    @Autowired
    public CompetitionDataSyncScheduler(
            CompetitionMapper competitionMapper,
            CompetitionProblemService competitionProblemService,
            CompetitionUserService competitionUserService,
            RedisService redisService
    ) {
        this.competitionMapper = competitionMapper;
        this.competitionProblemService = competitionProblemService;
        this.competitionUserService = competitionUserService;
        this.redisService = redisService;
    }

    /**
     * 每 5 分钟执行一次，同步进行中比赛的统计数据到数据库
     * 启动后延迟 1 分钟首次执行，避免应用启动期间 Redis 还未就绪
     */
    @Scheduled(fixedRate = 5 * 60 * 1000, initialDelay = 60 * 1000)
    public void syncOngoingCompetitionData() {
        logger.info("开始执行比赛数据定时同步任务");
        try {
            List<Competition> ongoingCompetitions = getOngoingCompetitions();
            if (ongoingCompetitions.isEmpty()) {
                logger.info("当前没有进行中的比赛，跳过同步");
                return;
            }

            for (Competition competition : ongoingCompetitions) {
                Long cid = competition.getId();
                try {
                    syncCompetitionProblemData(cid);
                } catch (Exception e) {
                    logger.error("同步比赛 ID={} 题目数据时发生异常", cid, e);
                }
                try {
                    syncCompetitionUserData(cid);
                } catch (Exception e) {
                    logger.error("同步比赛 ID={} 用户数据时发生异常", cid, e);
                }
            }
            logger.info("比赛数据定时同步任务执行完成，共同步 {} 场比赛", ongoingCompetitions.size());
        } catch (Exception e) {
            logger.error("比赛数据定时同步任务执行失败", e);
        }
    }

    /**
     * 获取当前正在进行中的比赛列表
     */
    private List<Competition> getOngoingCompetitions() {
        String now = LocalDateTime.now().format(FORMATTER);
        QueryWrapper<Competition> wrapper = new QueryWrapper<>();
        wrapper.le("begin_time", now)
               .ge("end_time", now)
               .select("id", "title", "begin_time", "end_time", "participant_type");
        return competitionMapper.selectList(wrapper);
    }

    /**
     * 同步单个比赛的用户通过数 / 罚时。
     * 个人赛按用户账号同步；团队赛按队长账号同步。
     * Redis 排行榜 ZSet 是当前比赛中所有参赛主体的快照，遍历它就能拿到 name 列表。
     */
    private void syncCompetitionUserData(Long cid) {
        String rankingKey = String.format(RANKING_KEY, cid);
        Set<ZSetOperations.TypedTuple<String>> userTuples = redisService.getZset(rankingKey);
        if (userTuples == null || userTuples.isEmpty()) {
            logger.info("比赛 ID={} Redis 排行榜为空，跳过用户数据同步", cid);
            return;
        }

        int syncedCount = 0;
        int skippedCount = 0;
        for (ZSetOperations.TypedTuple<String> tuple : userTuples) {
            String name = tuple.getValue();
            if (name == null) {
                skippedCount++;
                continue;
            }
            String passKey = String.format(USER_PASS_COUNT_KEY, cid, name);
            String penaltyKey = String.format(USER_PENALTY_KEY, cid, name);
            String passCountStr = redisService.getValueByKey(passKey);
            String penaltyTimeStr = redisService.getValueByKey(penaltyKey);

            // 与题目同步同样原则：两个 key 都不存在时跳过，避免 Redis 丢失时把 DB 覆盖为 0
            if (passCountStr == null && penaltyTimeStr == null) {
                skippedCount++;
                continue;
            }

            int passCount = passCountStr != null ? safeParseInt(passCountStr) : 0;
            int penaltyTime = penaltyTimeStr != null ? safeParseInt(penaltyTimeStr) : 0;
            competitionUserService.setStats(cid, name, passCount, penaltyTime);
            syncedCount++;
        }
        logger.info("比赛 ID={} 用户数据同步完成：成功 {} 人，跳过 {} 人（共 {} 人）",
                cid, syncedCount, skippedCount, userTuples.size());
    }

    /**
     * 同步单个比赛的题目统计数据
     */
    private void syncCompetitionProblemData(Long cid) {
        List<CompetitionProblem> problems = competitionProblemService.getProblemList(cid);
        if (problems == null || problems.isEmpty()) {
            logger.warn("比赛 ID={} 没有题目，跳过同步", cid);
            return;
        }

        int syncedCount = 0;
        int skippedCount = 0;
        for (CompetitionProblem problem : problems) {
            Long pid = problem.getProblemId();
            String passKey = String.format(PROBLEM_PASS_KEY, cid, pid);
            String submitKey = String.format(PROBLEM_SUBMIT_KEY, cid, pid);

            String passCountStr = redisService.getValueByKey(passKey);
            String submitCountStr = redisService.getValueByKey(submitKey);

            // 关键：Redis 两个 key 都不存在时跳过，避免在 Redis 缓存丢失时把数据库统计覆盖为 0
            if (passCountStr == null && submitCountStr == null) {
                skippedCount++;
                continue;
            }

            int passCount = passCountStr != null ? safeParseInt(passCountStr) : 0;
            int submitCount = submitCountStr != null ? safeParseInt(submitCountStr) : 0;

            // 防御：通过数不应大于提交数
            if (passCount > submitCount) {
                logger.warn("比赛 ID={} 题目 ID={} 通过数({}) > 提交数({})，数据异常，跳过同步",
                        cid, pid, passCount, submitCount);
                skippedCount++;
                continue;
            }

            // 覆盖式更新到数据库
            competitionProblemService.setCount(pid, passCount, submitCount, cid);
            syncedCount++;
        }
        logger.info("比赛 ID={} 同步完成：成功 {} 题，跳过 {} 题（共 {} 题）",
                cid, syncedCount, skippedCount, problems.size());
    }

    private int safeParseInt(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
