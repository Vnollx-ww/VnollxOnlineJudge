package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.dto.competition.ConfirmPasswordDTO;
import com.example.vnollxonlinejudge.model.dto.competition.GetCompetitionStatusDTO;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.ProblemService;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;

@RestController
@RequestMapping("/competition")
public class CompetitionController {
    private final CompetitionService competitionService;
    private final ProblemService problemService;
    
    @Autowired
    public CompetitionController(
            CompetitionService competitionService,
            ProblemService problemService
    ) {
        this.competitionService = competitionService;
        this.problemService = problemService;
    }

    @GetMapping("/{id}")
    public ModelAndView competitionDetail(@PathVariable Long id) {
        CompetitionVo competition = competitionService.getCompetitionById(id);
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
    @GetMapping("/list-problem")
    public Result<List<ProblemVo>> getProblemList(@RequestParam String id){
        return Result.Success(competitionService.getProblemList(Long.parseLong(id))
                ,"获取比赛题目列表成功");
    }
    @GetMapping("/list-user")
    public Result<List<UserVo>> getUserList(@RequestParam String id){

        return Result.Success(competitionService.getUserList(Long.parseLong(id))
                ,"获取比赛用户列表成功");
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
    @GetMapping("/count")
    public Result<Long> getCompetitionCount(){
        return Result.Success(competitionService.getCompetitionCount(),"获取比赛数量成功");
    }
 }
