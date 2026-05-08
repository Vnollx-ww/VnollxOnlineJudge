package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.admin.AdminAntiCheatReviewDTO;
import com.example.vnollxonlinejudge.model.dto.competition.AntiCheatReportDTO;
import com.example.vnollxonlinejudge.model.vo.competition.AntiCheatEventVo;
import com.example.vnollxonlinejudge.model.vo.competition.AntiCheatSummaryVo;
import com.example.vnollxonlinejudge.model.vo.competition.AntiCheatUserDetailVo;

import java.util.List;
import java.util.Map;

public interface CompetitionAntiCheatService {
    /**
     * 用户侧批量上报防作弊事件。后端会校验比赛存在、用户登录态，并基于事件类型与时长打分。
     * @param userId  当前登录用户ID（来自 token，不信任前端）
     * @param userName 当前登录用户名
     * @param ipAddress 来源IP
     * @param userAgent UA
     * @param req      上报内容
     */
    void reportEvents(Long userId, String userName, String ipAddress, String userAgent, AntiCheatReportDTO req);

    /** 比赛维度的用户风险汇总列表（管理端） */
    List<AntiCheatSummaryVo> getSummaries(Long competitionId, String keyword, String riskLevel, String reviewStatus);

    /** 比赛维度统计卡片数据（参与人数 / 可疑 / 高风险 / 待复核 / 总事件） */
    Map<String, Object> getStatistics(Long competitionId);

    /** 用户详情 = 汇总 + 最近事件 */
    AntiCheatUserDetailVo getUserDetail(Long competitionId, Long userId, Integer limit);

    /** 比赛事件列表（按时间倒序，可筛选用户/类型/等级） */
    List<AntiCheatEventVo> getEvents(Long competitionId, Long userId, String eventType, String riskLevel, Integer limit);

    /** 人工复核 */
    void review(Long competitionId, Long userId, Long reviewerId, AdminAntiCheatReviewDTO dto);
}
