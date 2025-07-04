package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.SolveService;
import com.example.vnollxonlinejudge.utils.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/solve")
public class SolveController {
    @Autowired
    private SolveService solveService;
    @Autowired
    private ProblemService problemService;
    @GetMapping("/{id}")
    public ModelAndView solveDetail(@PathVariable Long id) {
        Result result = solveService.getSolve(id);
        ModelAndView modelAndView = new ModelAndView();
        if (result.getData() == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("solve", result.getData());
            modelAndView.setViewName("solve");
        }
        return modelAndView;
    }
    @GetMapping("/list/{id}")
    public ModelAndView solveListDetail(@PathVariable Long id) {
        Result result = problemService.getProblemInfo(id,0);
        ModelAndView modelAndView = new ModelAndView();
        if (result.getData() == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("solvelist", result.getData());
            modelAndView.setViewName("solvelist");
        }
        return modelAndView;
    }
    @GetMapping("/publish/{id}")
    public ModelAndView solvePublishDetail(@PathVariable Long id) {
        Result result = problemService.getProblemInfo(id,0);
        ModelAndView modelAndView = new ModelAndView();
        if (result.getData() == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("problem", result.getData());
            modelAndView.setViewName("publishSolution");
        }
        return modelAndView;
    }
    @PostMapping("/create")
    public Result createSolve(@RequestParam String content,@RequestParam String name, @RequestParam String pid,@RequestParam String title,@RequestParam String pname, HttpServletRequest request){
        String userId = (String) request.getAttribute("uid");
        if (userId != null) {
            return solveService.createSolve(content,name,Long.parseLong(pid),Long.parseLong(userId),title,pname);
        } else {
            return Result.LogicError("未获取到用户ID");
        }
    }
    @PostMapping("/getallsolves")
    public Result getAllSolves(@RequestParam String pid){
        return solveService.getAllSolves(Long.parseLong(pid));
    }
}
