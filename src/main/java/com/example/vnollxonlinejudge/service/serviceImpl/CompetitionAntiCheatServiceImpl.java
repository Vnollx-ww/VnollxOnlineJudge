package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.CompetitionAntiCheatEventMapper;
import com.example.vnollxonlinejudge.mapper.CompetitionAntiCheatSummaryMapper;
import com.example.vnollxonlinejudge.model.dto.admin.AdminAntiCheatReviewDTO;
import com.example.vnollxonlinejudge.model.dto.competition.AntiCheatReportDTO;
import com.example.vnollxonlinejudge.model.entity.CompetitionAntiCheatEvent;
import com.example.vnollxonlinejudge.model.entity.CompetitionAntiCheatSummary;
import com.example.vnollxonlinejudge.model.vo.competition.AntiCheatEventVo;
import com.example.vnollxonlinejudge.model.vo.competition.AntiCheatSummaryVo;
import com.example.vnollxonlinejudge.model.vo.competition.AntiCheatUserDetailVo;
import com.example.vnollxonlinejudge.service.CompetitionAntiCheatService;
import com.example.vnollxonlinejudge.service.CompetitionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CompetitionAntiCheatServiceImpl
        extends ServiceImpl<CompetitionAntiCheatEventMapper, CompetitionAntiCheatEvent>
        implements CompetitionAntiCheatService {

    private static final Logger logger = LoggerFactory.getLogger(CompetitionAntiCheatServiceImpl.class);

    private final CompetitionAntiCheatSummaryMapper summaryMapper;
    private final CompetitionService competitionService;

    @Autowired
    public CompetitionAntiCheatServiceImpl(
            CompetitionAntiCheatSummaryMapper summaryMapper,
            @Lazy CompetitionService competitionService
    ) {
        this.summaryMapper = summaryMapper;
        this.competitionService = competitionService;
    }

    // ==================== 风险评分规则 ====================

    /** 单条事件评分。返回 [riskScore, durationSeconds(可能修正)] */
    private int scoreEvent(String eventType, Integer durationSeconds, String detailJson) {
        int dur = durationSeconds == null ? 0 : Math.max(0, durationSeconds);
        switch (eventType == null ? "" : eventType) {
            case "PAGE_HIDDEN":
            case "WINDOW_BLUR":
                if (dur <= 0) return 1;
                if (dur <= 10) return 2;
                if (dur <= 60) return 8;
                if (dur <= 180) return 15;
                return 25;
            case "FULLSCREEN_EXIT":
                return 10;
            case "PASTE_CODE": {
                int len = parseIntFromJson(detailJson, "length", 0);
                if (len <= 30) return 2;
                if (len <= 200) return 10;
                if (len <= 600) return 18;
                return 25;
            }
            case "COPY_CODE":
                return 1;
            case "CONTEXT_MENU":
                return 1;
            case "SUBMIT_AFTER_LEAVE":
                return 20;
            default:
                return 0;
        }
    }

    private int parseIntFromJson(String json, String key, int dft) {
        if (json == null) return dft;
        // 极简提取：避免引入解析依赖；前端只放数字
        try {
            String pat = "\"" + key + "\"";
            int i = json.indexOf(pat);
            if (i < 0) return dft;
            int colon = json.indexOf(':', i);
            if (colon < 0) return dft;
            int j = colon + 1;
            StringBuilder num = new StringBuilder();
            while (j < json.length() && (Character.isDigit(json.charAt(j)) || json.charAt(j) == '-')) {
                num.append(json.charAt(j));
                j++;
                if (num.length() > 12) break;
            }
            if (num.length() == 0) return dft;
            return Integer.parseInt(num.toString());
        } catch (Exception e) {
            return dft;
        }
    }

    private String levelOf(int totalScore) {
        if (totalScore >= 80) return "CRITICAL";
        if (totalScore >= 50) return "HIGH";
        if (totalScore >= 20) return "MEDIUM";
        return "LOW";
    }

    // ==================== 用户上报 ====================

    @Override
    @Transactional
    public void reportEvents(Long userId, String userName, String ipAddress, String userAgent, AntiCheatReportDTO req) {
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (req == null || req.getCompetitionId() == null || req.getEvents() == null || req.getEvents().isEmpty()) {
            return;
        }
        Long cid = req.getCompetitionId();
        // 校验比赛存在（不存在会抛 BusinessException）
        competitionService.getCompetitionById(cid);

        int now = req.getEvents().size();
        if (now > 50) {
            // 简单限流：单次最多 50 条
            req.setEvents(req.getEvents().subList(0, 50));
        }

        int addedScore = 0;
        int leaveCountInc = 0;
        int leaveSecondsInc = 0;
        int fullscreenExitInc = 0;
        int pasteInc = 0;
        int eventCountInc = 0;
        LocalDateTime nowTime = LocalDateTime.now();

        List<CompetitionAntiCheatEvent> toInsert = new ArrayList<>();
        for (AntiCheatReportDTO.EventItem item : req.getEvents()) {
            if (item == null || item.getEventType() == null) continue;
            String type = item.getEventType();
            int score = scoreEvent(type, item.getDurationSeconds(), item.getDetailJson());
            String level;
            if (score >= 25) level = "HIGH";
            else if (score >= 10) level = "MEDIUM";
            else level = "LOW";

            CompetitionAntiCheatEvent e = CompetitionAntiCheatEvent.builder()
                    .competitionId(cid)
                    .problemId(item.getProblemId())
                    .userId(userId)
                    .username(userName)
                    .eventType(type)
                    .riskLevel(level)
                    .riskScore(score)
                    .startedAt(item.getStartedAt())
                    .endedAt(item.getEndedAt())
                    .durationSeconds(item.getDurationSeconds())
                    .submissionId(item.getSubmissionId())
                    .detailJson(item.getDetailJson())
                    .ipAddress(ipAddress)
                    .userAgent(userAgent == null ? null : (userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent))
                    .createdAt(nowTime)
                    .build();
            toInsert.add(e);

            addedScore += score;
            eventCountInc += 1;
            if ("PAGE_HIDDEN".equals(type) || "WINDOW_BLUR".equals(type)) {
                leaveCountInc += 1;
                leaveSecondsInc += item.getDurationSeconds() == null ? 0 : Math.max(0, item.getDurationSeconds());
            } else if ("FULLSCREEN_EXIT".equals(type)) {
                fullscreenExitInc += 1;
            } else if ("PASTE_CODE".equals(type)) {
                pasteInc += 1;
            }
        }

        if (toInsert.isEmpty()) return;
        this.saveBatch(toInsert);

        // upsert 汇总
        upsertSummary(cid, userId, userName, addedScore, eventCountInc,
                leaveCountInc, leaveSecondsInc, fullscreenExitInc, pasteInc, nowTime);
    }

    private void upsertSummary(Long cid, Long userId, String userName,
                               int addedScore, int eventCountInc,
                               int leaveCountInc, int leaveSecondsInc,
                               int fullscreenExitInc, int pasteInc,
                               LocalDateTime now) {
        QueryWrapper<CompetitionAntiCheatSummary> qw = new QueryWrapper<>();
        qw.eq("competition_id", cid).eq("user_id", userId);
        CompetitionAntiCheatSummary existing = summaryMapper.selectOne(qw);
        if (existing == null) {
            CompetitionAntiCheatSummary s = CompetitionAntiCheatSummary.builder()
                    .competitionId(cid)
                    .userId(userId)
                    .username(userName)
                    .totalScore(addedScore)
                    .riskLevel(levelOf(addedScore))
                    .eventCount(eventCountInc)
                    .leaveCount(leaveCountInc)
                    .leaveTotalSeconds(leaveSecondsInc)
                    .fullscreenExitCount(fullscreenExitInc)
                    .pasteCount(pasteInc)
                    .lastEventAt(now)
                    .reviewStatus("PENDING")
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
            try {
                summaryMapper.insert(s);
            } catch (DuplicateKeyException dup) {
                // 并发兜底：再走一次 update
                applyIncrementalUpdate(cid, userId, userName, addedScore, eventCountInc,
                        leaveCountInc, leaveSecondsInc, fullscreenExitInc, pasteInc, now);
            }
        } else {
            applyIncrementalUpdate(cid, userId, userName, addedScore, eventCountInc,
                    leaveCountInc, leaveSecondsInc, fullscreenExitInc, pasteInc, now);
        }
    }

    private void applyIncrementalUpdate(Long cid, Long userId, String userName,
                                        int addedScore, int eventCountInc,
                                        int leaveCountInc, int leaveSecondsInc,
                                        int fullscreenExitInc, int pasteInc,
                                        LocalDateTime now) {
        // 使用 SQL 累加，避免读后写的竞态
        LambdaUpdateWrapper<CompetitionAntiCheatSummary> uw = new LambdaUpdateWrapper<>();
        uw.eq(CompetitionAntiCheatSummary::getCompetitionId, cid)
                .eq(CompetitionAntiCheatSummary::getUserId, userId)
                .setSql("total_score = total_score + " + addedScore)
                .setSql("event_count = event_count + " + eventCountInc)
                .setSql("leave_count = leave_count + " + leaveCountInc)
                .setSql("leave_total_seconds = leave_total_seconds + " + leaveSecondsInc)
                .setSql("fullscreen_exit_count = fullscreen_exit_count + " + fullscreenExitInc)
                .setSql("paste_count = paste_count + " + pasteInc)
                .set(CompetitionAntiCheatSummary::getLastEventAt, now);
        if (StringUtils.isNotBlank(userName)) {
            uw.set(CompetitionAntiCheatSummary::getUsername, userName);
        }
        summaryMapper.update(null, uw);

        // 重读后刷新等级（不影响并发主流程，仅追加一次小写）
        CompetitionAntiCheatSummary refreshed = summaryMapper.selectOne(
                new QueryWrapper<CompetitionAntiCheatSummary>()
                        .eq("competition_id", cid).eq("user_id", userId));
        if (refreshed != null) {
            String newLevel = levelOf(refreshed.getTotalScore() == null ? 0 : refreshed.getTotalScore());
            if (!newLevel.equals(refreshed.getRiskLevel())) {
                LambdaUpdateWrapper<CompetitionAntiCheatSummary> levelUw = new LambdaUpdateWrapper<>();
                levelUw.eq(CompetitionAntiCheatSummary::getId, refreshed.getId())
                        .set(CompetitionAntiCheatSummary::getRiskLevel, newLevel);
                summaryMapper.update(null, levelUw);
            }
        }
    }

    // ==================== 管理端查询 ====================

    @Override
    public List<AntiCheatSummaryVo> getSummaries(Long cid, String keyword, String riskLevel, String reviewStatus) {
        QueryWrapper<CompetitionAntiCheatSummary> qw = new QueryWrapper<>();
        qw.eq("competition_id", cid);
        if (StringUtils.isNotBlank(keyword)) {
            qw.like("username", keyword);
        }
        if (StringUtils.isNotBlank(riskLevel)) {
            qw.eq("risk_level", riskLevel);
        }
        if (StringUtils.isNotBlank(reviewStatus)) {
            qw.eq("review_status", reviewStatus);
        }
        qw.orderByDesc("total_score").orderByDesc("last_event_at");
        return summaryMapper.selectList(qw).stream()
                .map(AntiCheatSummaryVo::new)
                .collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> getStatistics(Long cid) {
        Map<String, Object> result = new LinkedHashMap<>();
        QueryWrapper<CompetitionAntiCheatSummary> base = new QueryWrapper<>();
        base.eq("competition_id", cid);

        long total = summaryMapper.selectCount(base);
        long suspicious = summaryMapper.selectCount(new QueryWrapper<CompetitionAntiCheatSummary>()
                .eq("competition_id", cid).ge("total_score", 20));
        long highRisk = summaryMapper.selectCount(new QueryWrapper<CompetitionAntiCheatSummary>()
                .eq("competition_id", cid).in("risk_level", Arrays.asList("HIGH", "CRITICAL")));
        long pending = summaryMapper.selectCount(new QueryWrapper<CompetitionAntiCheatSummary>()
                .eq("competition_id", cid).eq("review_status", "PENDING").ge("total_score", 20));
        long eventTotal = this.count(new QueryWrapper<CompetitionAntiCheatEvent>().eq("competition_id", cid));

        result.put("totalUsers", total);
        result.put("suspiciousUsers", suspicious);
        result.put("highRiskUsers", highRisk);
        result.put("pendingReviewUsers", pending);
        result.put("totalEvents", eventTotal);
        return result;
    }

    @Override
    public AntiCheatUserDetailVo getUserDetail(Long cid, Long userId, Integer limit) {
        AntiCheatUserDetailVo vo = new AntiCheatUserDetailVo();
        CompetitionAntiCheatSummary s = summaryMapper.selectOne(new QueryWrapper<CompetitionAntiCheatSummary>()
                .eq("competition_id", cid).eq("user_id", userId));
        vo.setSummary(s == null ? null : new AntiCheatSummaryVo(s));

        int lim = (limit == null || limit <= 0 || limit > 1000) ? 200 : limit;
        QueryWrapper<CompetitionAntiCheatEvent> qw = new QueryWrapper<>();
        qw.eq("competition_id", cid).eq("user_id", userId)
                .orderByDesc("created_at").orderByDesc("id").last("limit " + lim);
        List<AntiCheatEventVo> events = this.list(qw).stream()
                .map(AntiCheatEventVo::new)
                .collect(Collectors.toList());
        vo.setEvents(events);
        return vo;
    }

    @Override
    public List<AntiCheatEventVo> getEvents(Long cid, Long userId, String eventType, String riskLevel, Integer limit) {
        int lim = (limit == null || limit <= 0 || limit > 2000) ? 500 : limit;
        QueryWrapper<CompetitionAntiCheatEvent> qw = new QueryWrapper<>();
        qw.eq("competition_id", cid);
        if (userId != null) qw.eq("user_id", userId);
        if (StringUtils.isNotBlank(eventType)) qw.eq("event_type", eventType);
        if (StringUtils.isNotBlank(riskLevel)) qw.eq("risk_level", riskLevel);
        qw.orderByDesc("created_at").orderByDesc("id").last("limit " + lim);
        return this.list(qw).stream().map(AntiCheatEventVo::new).collect(Collectors.toList());
    }

    @Override
    public String exportCsv(Long cid, String keyword, String riskLevel, String reviewStatus) {
        List<AntiCheatSummaryVo> summaries = getSummaries(cid, keyword, riskLevel, reviewStatus);
        Set<Long> userIds = summaries.stream()
                .map(AntiCheatSummaryVo::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF');
        appendCsvRow(sb, Arrays.asList("比赛ID", "用户ID", "用户名", "风险等级", "总分", "事件数", "离开次数", "离开总时长(秒)", "退出全屏次数", "粘贴次数", "最近事件时间", "复核状态", "复核结论", "复核备注", "复核时间"));
        for (AntiCheatSummaryVo item : summaries) {
            appendCsvRow(sb, Arrays.asList(
                    cid,
                    item.getUserId(),
                    item.getUsername(),
                    item.getRiskLevel(),
                    item.getTotalScore(),
                    item.getEventCount(),
                    item.getLeaveCount(),
                    item.getLeaveTotalSeconds(),
                    item.getFullscreenExitCount(),
                    item.getPasteCount(),
                    item.getLastEventAt(),
                    item.getReviewStatus(),
                    item.getReviewResult(),
                    item.getReviewNote(),
                    item.getReviewedAt()
            ));
        }

        sb.append("\n");
        appendCsvRow(sb, Arrays.asList("事件ID", "比赛ID", "题目ID", "用户ID", "用户名", "事件类型", "风险等级", "风险分", "开始时间", "结束时间", "持续秒数", "提交ID", "IP", "User-Agent", "详情", "创建时间"));
        if (!userIds.isEmpty()) {
            QueryWrapper<CompetitionAntiCheatEvent> qw = new QueryWrapper<>();
            qw.eq("competition_id", cid).in("user_id", userIds)
                    .orderByAsc("user_id").orderByDesc("created_at").orderByDesc("id");
            for (CompetitionAntiCheatEvent event : this.list(qw)) {
                appendCsvRow(sb, Arrays.asList(
                        event.getId(),
                        event.getCompetitionId(),
                        event.getProblemId(),
                        event.getUserId(),
                        event.getUsername(),
                        event.getEventType(),
                        event.getRiskLevel(),
                        event.getRiskScore(),
                        event.getStartedAt(),
                        event.getEndedAt(),
                        event.getDurationSeconds(),
                        event.getSubmissionId(),
                        event.getIpAddress(),
                        event.getUserAgent(),
                        event.getDetailJson(),
                        event.getCreatedAt()
                ));
            }
        }
        return sb.toString();
    }

    private void appendCsvRow(StringBuilder sb, List<?> values) {
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(escapeCsv(values.get(i)));
        }
        sb.append('\n');
    }

    private String escapeCsv(Object value) {
        if (value == null) return "";
        String s = String.valueOf(value).replace("\r", " ").replace("\n", " ");
        if (s.contains(",") || s.contains("\"")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    @Override
    @Transactional
    public void review(Long cid, Long userId, Long reviewerId, AdminAntiCheatReviewDTO dto) {
        if (dto == null) {
            throw new BusinessException("复核内容为空");
        }
        CompetitionAntiCheatSummary existing = summaryMapper.selectOne(new QueryWrapper<CompetitionAntiCheatSummary>()
                .eq("competition_id", cid).eq("user_id", userId));
        if (existing == null) {
            throw new BusinessException("该用户在此比赛暂无防作弊记录");
        }
        LambdaUpdateWrapper<CompetitionAntiCheatSummary> uw = new LambdaUpdateWrapper<>();
        uw.eq(CompetitionAntiCheatSummary::getId, existing.getId());
        if (StringUtils.isNotBlank(dto.getReviewStatus())) {
            uw.set(CompetitionAntiCheatSummary::getReviewStatus, dto.getReviewStatus());
        }
        if (dto.getReviewResult() != null) {
            uw.set(CompetitionAntiCheatSummary::getReviewResult, dto.getReviewResult());
        }
        if (dto.getReviewNote() != null) {
            uw.set(CompetitionAntiCheatSummary::getReviewNote, dto.getReviewNote());
        }
        uw.set(CompetitionAntiCheatSummary::getReviewerId, reviewerId);
        uw.set(CompetitionAntiCheatSummary::getReviewedAt, LocalDateTime.now());
        summaryMapper.update(null, uw);
    }
}
