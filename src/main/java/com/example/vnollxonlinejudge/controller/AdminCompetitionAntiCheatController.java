package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.example.vnollxonlinejudge.model.dto.admin.AdminAntiCheatReviewDTO;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.competition.AntiCheatEventVo;
import com.example.vnollxonlinejudge.model.vo.competition.AntiCheatSummaryVo;
import com.example.vnollxonlinejudge.model.vo.competition.AntiCheatUserDetailVo;
import com.example.vnollxonlinejudge.service.CompetitionAntiCheatService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 管理端：比赛防作弊查看与人工复核
 */
@RestController
@RequestMapping("/api/v1/admin/competition")
public class AdminCompetitionAntiCheatController {

    private final CompetitionAntiCheatService antiCheatService;

    @Autowired
    public AdminCompetitionAntiCheatController(CompetitionAntiCheatService antiCheatService) {
        this.antiCheatService = antiCheatService;
    }

    /** 比赛维度的用户风险汇总 */
    @GetMapping("/{cid}/anti-cheat/summaries")
    @RequirePermission(PermissionCode.COMPETITION_ANTI_CHEAT_VIEW)
    public Result<List<AntiCheatSummaryVo>> getSummaries(
            @PathVariable Long cid,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) String reviewStatus
    ) {
        return Result.Success(antiCheatService.getSummaries(cid, keyword, riskLevel, reviewStatus), "获取防作弊汇总成功");
    }

    /** 比赛维度统计卡片 */
    @GetMapping("/{cid}/anti-cheat/statistics")
    @RequirePermission(PermissionCode.COMPETITION_ANTI_CHEAT_VIEW)
    public Result<Map<String, Object>> getStatistics(@PathVariable Long cid) {
        return Result.Success(antiCheatService.getStatistics(cid), "获取防作弊统计成功");
    }

    /** 单用户详情：汇总 + 最近事件 */
    @GetMapping("/{cid}/anti-cheat/users/{uid}")
    @RequirePermission(PermissionCode.COMPETITION_ANTI_CHEAT_VIEW)
    public Result<AntiCheatUserDetailVo> getUserDetail(
            @PathVariable Long cid,
            @PathVariable Long uid,
            @RequestParam(required = false) Integer limit
    ) {
        return Result.Success(antiCheatService.getUserDetail(cid, uid, limit), "获取用户防作弊详情成功");
    }

    /** 比赛维度事件列表（可筛选） */
    @GetMapping("/{cid}/anti-cheat/events")
    @RequirePermission(PermissionCode.COMPETITION_ANTI_CHEAT_VIEW)
    public Result<List<AntiCheatEventVo>> getEvents(
            @PathVariable Long cid,
            @RequestParam(required = false) Long uid,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) Integer limit
    ) {
        return Result.Success(antiCheatService.getEvents(cid, uid, eventType, riskLevel, limit), "获取防作弊事件列表成功");
    }

    /** 人工复核 */
    @PutMapping("/{cid}/anti-cheat/users/{uid}/review")
    @RequirePermission(PermissionCode.COMPETITION_ANTI_CHEAT_REVIEW)
    public Result<Void> review(
            @PathVariable Long cid,
            @PathVariable Long uid,
            @RequestBody AdminAntiCheatReviewDTO req
    ) {
        Long reviewerId = UserContextHolder.getCurrentUserId();
        antiCheatService.review(cid, uid, reviewerId, req);
        return Result.Success("复核已保存");
    }
}
