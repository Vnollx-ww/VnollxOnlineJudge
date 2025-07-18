package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.domain.Competition;
import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.ProblemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

@RestController
@RequestMapping("/competition")
public class CompetitionController {
    @Autowired
    private CompetitionService competitionService;
    @Autowired
    private ProblemService problemService;
    @GetMapping("/{id}")
    public ModelAndView competitionDetail(@PathVariable Long id) {
        Competition competition = competitionService.getCompetitionById(id);
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
        Competition competition = competitionService.getCompetitionById(id);
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
        Competition competition = competitionService.getCompetitionById(id);
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
        Problem problem= problemService.getProblemInfo(pid,cid);
        ModelAndView modelAndView = new ModelAndView();
        if (problem== null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("competition_problem", problem);
            modelAndView.setViewName("competition_problem");
        }
        return modelAndView;
    }
    @PostMapping("/create")
    public Result createCompetition(@RequestParam String title,@RequestParam String description,@RequestParam String begin_time,@RequestParam String end_time,@RequestParam String password){
        competitionService.createCompetition(title,description,begin_time,end_time,password);
        return Result.Success("创建比赛成功！！！");
    }
    @PostMapping("/getlist")
    public Result getCompetitionList(){

        return Result.Success(competitionService.getCompetitionList()
                , "获取比赛列表成功！！！");
    }
    @PostMapping("/confirm")
    public Result confirmPassword(@RequestParam String id,@RequestParam String password){
        competitionService.confirmPassword(Long.parseLong(id),password);
        return Result.Success("密码正确，欢迎进入比赛");
    }
    @PostMapping("/getproblemlist")
    public Result getProblemList(@RequestParam String id){
        return Result.Success(competitionService.getProblemList(Long.parseLong(id))
                ,"获取比赛题目列表成功");
    }
    @PostMapping("getuserlist")
    public Result getUserList(@RequestParam String id){

        return Result.Success(competitionService.getUserList(Long.parseLong(id))
                ,"获取比赛用户列表成功");
    }
    @PostMapping("judgeisopen")
    public Result judgeIsOpenById(@RequestParam String now,@RequestParam String id){
        competitionService.judgeIsOpenById(now,Long.parseLong(id));
        return Result.Success("比赛开放中");
    }
    @PostMapping("judgeisend")
    public Result judgeIsEndById(@RequestParam String now,@RequestParam String id){
        competitionService.judgeIsEndById(now,Long.parseLong(id));
        return Result.Success("比赛开放中");
    }
}
