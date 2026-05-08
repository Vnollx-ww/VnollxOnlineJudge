package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.dto.competition.AntiCheatReportDTO;
import com.example.vnollxonlinejudge.model.dto.competition.ConfirmPasswordDTO;
import com.example.vnollxonlinejudge.model.dto.competition.GetCompetitionStatusDTO;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionRanklistVo;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionVo;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionProblemBriefVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import com.example.vnollxonlinejudge.service.CompetitionAntiCheatService;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.CompetitionUserService;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import com.example.vnollxonlinejudge.utils.UserContextHolder;

import java.util.List;

@RestController
@RequestMapping("/api/v1/competition")
public class CompetitionController {
    private final CompetitionService competitionService;
    private final CompetitionUserService competitionUserService;
    private final CompetitionAntiCheatService antiCheatService;
    private final ProblemService problemService;
    private final UserService userService;
    
    @Autowired
    public CompetitionController(
            CompetitionService competitionService,
            ProblemService problemService,
            CompetitionUserService competitionUserService,
            CompetitionAntiCheatService antiCheatService,
            UserService userService
    ) {
        this.competitionService = competitionService;
        this.problemService = problemService;
        this.competitionUserService = competitionUserService;
        this.antiCheatService = antiCheatService;
        this.userService = userService;
    }

    /** 比赛防作弊事件上报：用户侧调用 */
    @PostMapping("/anti-cheat/report")
    public Result<Void> reportAntiCheat(@RequestBody AntiCheatReportDTO req, HttpServletRequest request) {
        Long userId = UserContextHolder.getCurrentUserId();
        String userName = null;
        if (userId != null) {
            User u = userService.getUserEntityById(userId);
            if (u != null) userName = u.getName();
        }
        String ip = extractIp(request);
        String ua = request.getHeader("User-Agent");
        antiCheatService.reportEvents(userId, userName, ip, ua, req);
        return Result.Success("上报成功");
    }

    private String extractIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isEmpty()) {
            int comma = ip.indexOf(',');
            if (comma > 0) ip = ip.substring(0, comma);
            return ip.trim();
        }
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isEmpty()) return ip;
        return request.getRemoteAddr();
    }
    @GetMapping("/ranklist/{id}")
    public ModelAndView competitionRankListDetail(@PathVariable Long id) {
        CompetitionVo competition = competitionService.getCompetitionById(id);
        ModelAndView modelAndView = new ModelAndView();
        if (competition == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("competition", competition);
            modelAndView.setViewName("competition_ranklist");
        }
        return modelAndView;
    }
    @GetMapping("/submission/{id}")
    public ModelAndView competitionSubmissionDetail(@PathVariable Long id) {
        CompetitionVo competition = competitionService.getCompetitionById(id);
        ModelAndView modelAndView = new ModelAndView();
        if (competition == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("competition", competition);
            modelAndView.setViewName("competition_submission");
        }
        return modelAndView;
    }
    @GetMapping("/problem/{cid}/{pid}")
    public ModelAndView competitionProblemDetail(@PathVariable Long cid, @PathVariable Long pid) {
        ProblemVo problem= problemService.getProblemInfo(pid,cid,null);
        ModelAndView modelAndView = new ModelAndView();
        if (problem== null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("competition_problem", problem);
            modelAndView.setViewName("competition_problem");
        }
        return modelAndView;
    }
    @GetMapping("/list")
    public Result<List<CompetitionVo>> getCompetitionList(){

        return Result.Success(competitionService.getCompetitionList(0,0,null)
                , "获取比赛列表成功！！！");
    }
    @GetMapping("/{id}")
    public Result<CompetitionVo> getCompetitionById(@PathVariable Long id){
        return Result.Success(competitionService.getCompetitionById(id), "获取比赛详情成功");
    }
    @GetMapping("/list-problem")
    public Result<List<CompetitionProblemBriefVo>> getProblemList(@RequestParam String id) {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(
                competitionService.getProblemList(Long.parseLong(id), userId),
                "获取比赛题目列表成功");
    }
    @GetMapping("/list-user")
    public Result<List<UserVo>> getUserList(@RequestParam String id){

        return Result.Success(competitionService.getUserList(Long.parseLong(id))
                ,"获取比赛用户列表成功");
    }
    @GetMapping("/ranklist-detail")
    public Result<CompetitionRanklistVo> getRanklist(@RequestParam String id){
        return Result.Success(competitionService.getRanklist(Long.parseLong(id))
                ,"获取比赛排行榜成功");
    }
    @PostMapping("/confirm")
    public Result<Void> confirmPassword(@RequestBody ConfirmPasswordDTO req){
        competitionService.confirmPassword(Long.parseLong(req.getId()),req.getPassword());
        return Result.Success("密码正确，欢迎进入比赛");
    }
    @PostMapping("/judgeIsOpen")
    public Result<Void> judgeIsOpenById(@RequestBody GetCompetitionStatusDTO req){
        competitionService.judgeIsOpenById(req.getNow(),Long.parseLong(req.getId()));
        return Result.Success("比赛开放中");
    }
    @PostMapping("/judgeIsEnd")
    public Result<Void> judgeIsEndById(@RequestBody GetCompetitionStatusDTO req){
        competitionService.judgeIsEndById(req.getNow(),Long.parseLong(req.getId()));
        return Result.Success("比赛开放中");
    }
    @PostMapping("/{cid}/finish")
    public Result<Void> finishCompetition(@PathVariable Long cid){
        Long userId = UserContextHolder.getCurrentUserId();
        competitionUserService.finishCompetition(cid, userId);
        return Result.Success("已结束比赛，无法再次提交");
    }
    @GetMapping("/{cid}/finish/status")
    public Result<Boolean> getFinishStatus(@PathVariable Long cid){
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(competitionUserService.hasFinishedCompetition(cid, userId), "获取个人比赛结束状态成功");
    }
    @GetMapping("/count")
    public Result<Long> getCompetitionCount(){
        return Result.Success(competitionService.getCompetitionCount(),"获取比赛数量成功");
    }
 }
