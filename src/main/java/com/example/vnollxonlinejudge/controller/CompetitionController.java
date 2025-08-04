package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.model.dto.request.competition.ConfirmPasswordRequest;
import com.example.vnollxonlinejudge.model.dto.request.competition.GetCompetitionStatusRequest;
import com.example.vnollxonlinejudge.model.dto.response.competition.CompetitionResponse;
import com.example.vnollxonlinejudge.model.dto.response.problem.ProblemResponse;
import com.example.vnollxonlinejudge.model.dto.response.user.UserResponse;
import com.example.vnollxonlinejudge.model.entity.Competition;
import com.example.vnollxonlinejudge.model.entity.Problem;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.ProblemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;

@RestController
@RequestMapping("/competition")
public class CompetitionController {
    @Autowired
    private CompetitionService competitionService;
    @Autowired
    private ProblemService problemService;
    @GetMapping("/{id}")
    public ModelAndView competitionDetail(@PathVariable Long id) {
        CompetitionResponse competition = competitionService.getCompetitionById(id);
        ModelAndView modelAndView = new ModelAndView();
        if (competition == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("competition",competition);
            modelAndView.setViewName("competition");
        }
        return modelAndView;
    }
    @GetMapping("/ranklist/{id}")
    public ModelAndView competitionRankListDetail(@PathVariable Long id) {
        CompetitionResponse  competition = competitionService.getCompetitionById(id);
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
        CompetitionResponse  competition = competitionService.getCompetitionById(id);
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
        ProblemResponse problem= problemService.getProblemInfo(pid,cid);
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
    public Result<List<CompetitionResponse>> getCompetitionList(){

        return Result.Success(competitionService.getCompetitionList(0,0,null)
                , "获取比赛列表成功！！！");
    }
    @GetMapping("/list-problem")
    public Result<List<ProblemResponse>> getProblemList(@RequestParam String id){
        return Result.Success(competitionService.getProblemList(Long.parseLong(id))
                ,"获取比赛题目列表成功");
    }
    @GetMapping("/list-user")
    public Result<List<UserResponse>> getUserList(@RequestParam String id){

        return Result.Success(competitionService.getUserList(Long.parseLong(id))
                ,"获取比赛用户列表成功");
    }
    @PostMapping("/confirm")
    public Result<Void> confirmPassword(@RequestBody ConfirmPasswordRequest req){
        competitionService.confirmPassword(Long.parseLong(req.getId()),req.getPassword());
        return Result.Success("密码正确，欢迎进入比赛");
    }
    @PostMapping("/judgeIsOpen")
    public Result<Boolean> judgeIsOpenById(@RequestBody GetCompetitionStatusRequest req){
        competitionService.judgeIsOpenById(req.getNow(),Long.parseLong(req.getId()));
        return Result.Success("比赛开放中");
    }
    @PostMapping("/judgeIsEnd")
    public Result<Void> judgeIsEndById(@RequestBody GetCompetitionStatusRequest req){
        competitionService.judgeIsEndById(req.getNow(),Long.parseLong(req.getId()));
        return Result.Success("比赛开放中");
    }
 }
