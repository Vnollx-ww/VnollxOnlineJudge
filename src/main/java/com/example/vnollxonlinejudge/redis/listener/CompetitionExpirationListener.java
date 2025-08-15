package com.example.vnollxonlinejudge.redis.listener;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.example.vnollxonlinejudge.model.entity.Problem;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.service.CompetitionProblemService;
import com.example.vnollxonlinejudge.service.CompetitionUserService;
import com.example.vnollxonlinejudge.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.listener.KeyExpirationEventMessageListener;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.resps.Tuple;

import java.util.List;
import java.util.Map;


public class CompetitionExpirationListener extends KeyExpirationEventMessageListener {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    @Autowired
    private JedisPool jedisPool;
    @Autowired
    private CompetitionUserService competitionUserService;
    @Autowired
    private CompetitionProblemService competitionProblemService;
    private static final String USER_PASS_COUNT_KEY = "competition_user_pass:%d:%s"; // cid:uid
    private static final String USER_PENALTY_KEY = "competition_user_penalty:%d:%s"; // cid:uid
    private static final String PROBLEM_PASS_KEY = "competition_problem_pass:%d:%d"; // cid:pid
    private static final String PROBLEM_SUBMIT_KEY = "competition_problem_submit:%d:%d"; // cid:pid
    private static final String RANKING_KEY = "competition_ranking:%d"; // cid

    private static final String TIME_OUT_KEY = "competition_time_out:%d"; // cid
    public CompetitionExpirationListener(RedisMessageListenerContainer listenerContainer) {
        super(listenerContainer);
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        // 获取过期的键名
        String expiredKey = message.toString();
        logger.info("检测到Redis键过期: {}", expiredKey);

        // 判断是否是比赛结束时间键
        if (expiredKey.contains("competition_time_out")) {

            try {
                // 提取比赛ID
                Long cid = extractCompetitionId(expiredKey);
                if (cid > 0) {
                    syncCompetitionData(cid);
                }
            } catch (Exception e) {
                logger.error("处理比赛过期事件时出错", e);
                // 可以添加重试机制或告警
            }
        }
    }

    private Long extractCompetitionId(String key) {
        try {
            // 从键名中提取比赛ID，例如 "competition:123:timeout"
            String[] parts = key.split(":");
            if (parts.length >= 2) {
                return Long.parseLong(parts[1]);
            }
        } catch (NumberFormatException e) {
            logger.error("从键名中提取比赛ID失败: {}", key, e);
        }
        return -1L;
    }

    private void syncCompetitionData(Long cid) {
        logger.info("开始同步比赛ID={}的数据到数据库", cid);

        try (Jedis jedis = jedisPool.getResource()) {
            syncRankingData(jedis, cid);
            syncProblemData(jedis, cid);
            logger.info("比赛ID={} 数据同步完成", cid);
        } catch (Exception e) {
            logger.error("同步比赛数据时发生异常", e);
            throw e;
        }
    }

    // 同步用户排名数据（与之前方案类似）
    private void syncRankingData(Jedis jedis, Long cid) {
        String rankingKey = String.format(RANKING_KEY, cid);

        // 获取所有用户排名（按分数从高到低）
        List<Tuple> userTuples = jedis.zrevrangeWithScores(rankingKey, 0, -1);

        for (Tuple tuple : userTuples) {
            String userName = tuple.getElement();
            // 获取用户通过题目数和罚时
            String userPassKey = String.format(USER_PASS_COUNT_KEY, cid, userName);
            String userPenaltyKey = String.format(USER_PENALTY_KEY, cid, userName);

            int passCount = Integer.parseInt(jedis.get(userPassKey));
            int penaltyTime = Integer.parseInt(jedis.get(userPenaltyKey));
            // 更新数据库记录
            competitionUserService.updatePenaltyTime(userName,cid,penaltyTime);
            competitionUserService.updatePassCount(userName,passCount);
        }
    }

    // 同步题目提交数据（与之前方案类似）
    private void syncProblemData(Jedis jedis, Long cid) {
        // 获取比赛的所有题目
        String cacheKey = "competition:" + cid + ":problems";
        String problemsJson = jedis.get(cacheKey);

        if (problemsJson != null) {
            TypeReference<Map<Integer, Problem>> typeRef = new TypeReference<Map<Integer, Problem>>() {};
            Map<Integer, Problem> problemMap = JSON.parseObject(problemsJson, typeRef);

            for (Problem problem : problemMap.values()) {
                Long pid = problem.getId();
                String problemPassKey = String.format(PROBLEM_PASS_KEY, cid, pid);
                String problemSubmitKey = String.format(PROBLEM_SUBMIT_KEY, cid, pid);

                int passCount = Integer.parseInt(jedis.get(problemPassKey));
                int submitCount = Integer.parseInt(jedis.get(problemSubmitKey));

                competitionProblemService.updateCount(pid,passCount,submitCount,cid);
            }
        }
    }
}