package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.utils.Result;
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
        Result result = competitionService.getCompetitionById(id);
        ModelAndView modelAndView = new ModelAndView();
        if (result.getData() == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("competition", result.getData());
            modelAndView.setViewName("competition");
        }
        return modelAndView;
    }
    @GetMapping("/ranklist/{id}")
    public ModelAndView competitionRankListDetail(@PathVariable Long id) {
        Result result = competitionService.getCompetitionById(id);
        ModelAndView modelAndView = new ModelAndView();
        if (result.getData() == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("competition", result.getData());
            modelAndView.setViewName("competition_ranklist");
        }
        return modelAndView;
    }
    @GetMapping("/submission/{id}")
    public ModelAndView competitionSubmissionDetail(@PathVariable Long id) {
        Result result = competitionService.getCompetitionById(id);
        ModelAndView modelAndView = new ModelAndView();
        if (result.getData() == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("competition", result.getData());
            modelAndView.setViewName("competition_submission");
        }
        return modelAndView;
    }
    @GetMapping("/problem/{cid}/{pid}")
    public ModelAndView competitionProblemDetail(@PathVariable Long cid, @PathVariable Long pid) {
        Result result = problemService.getProblemInfo(pid,cid);
        ModelAndView modelAndView = new ModelAndView();
        if (result.getData() == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("competition_problem", result.getData());
            modelAndView.setViewName("competition_problem");
        }
        return modelAndView;
    }
    @PostMapping("/create")
    public Result createCompetition(@RequestParam String title,@RequestParam String description,@RequestParam String begin_time,@RequestParam String end_time,@RequestParam String password){
        return competitionService.createCompetition(title,description,begin_time,end_time,password);
    }
    @PostMapping("/getlist")
    public Result getCompetitionList(){
        return competitionService.getCompetitionList();
    }
    @PostMapping("/confirm")
    public Result confirmPassword(@RequestParam String id,@RequestParam String password){
        return competitionService.confirmPassword(Long.parseLong(id),password);
    }
    @PostMapping("/getproblemlist")
    public Result getProblemList(@RequestParam String id){
        return competitionService.getProblemList(Long.parseLong(id));
    }
    @PostMapping("getuserlist")
    public Result getUserList(@RequestParam String id){
        return competitionService.getUserList(Long.parseLong(id));
    }
    @PostMapping("judgeisopen")
    public Result judgeIsOpenById(@RequestParam String now,@RequestParam String id){
        return competitionService.judgeIsOpenById(now,Long.parseLong(id));
    }
    @PostMapping("judgeisend")
    public Result judgeIsEndById(@RequestParam String now,@RequestParam String id){
        return competitionService.judgeIsEndById(now,Long.parseLong(id));
    }
}
