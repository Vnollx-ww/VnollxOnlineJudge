package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.domain.Solve;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.SolveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;
import com.example.vnollxonlinejudge.common.result.Result;
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
        Solve solve= solveService.getSolve(id);
        ModelAndView modelAndView = new ModelAndView();
        if ( solve == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("solve",  solve);
            modelAndView.setViewName("solve");
        }
        return modelAndView;
    }
    @GetMapping("/list/{id}")
    public ModelAndView solveListDetail(@PathVariable Long id) {
        Problem problem = problemService.getProblemInfo(id,0);
        ModelAndView modelAndView = new ModelAndView();
        if (problem == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("solvelist", problem );
            modelAndView.setViewName("solvelist");
        }
        return modelAndView;
    }
    @GetMapping("/publish/{id}")
    public ModelAndView solvePublishDetail(@PathVariable Long id) {
        Problem problem = problemService.getProblemInfo(id,0);
        ModelAndView modelAndView = new ModelAndView();
        if (problem  == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("problem", problem );
            modelAndView.setViewName("publishSolution");
        }
        return modelAndView;
    }
    @PostMapping("/create")
    public Result createSolve(@RequestParam String content,@RequestParam String name, @RequestParam String pid,@RequestParam String title,@RequestParam String pname, HttpServletRequest request){
        String userId = (String) request.getAttribute("uid");
        if (userId != null) {
            solveService.createSolve(content,name,Long.parseLong(pid),Long.parseLong(userId),title,pname);
            return Result.Success("创建题解成功");
        } else {
            return Result.LogicError("未获取到用户ID");
        }
    }
    @PostMapping("/getallsolves")
    public Result getAllSolves(@RequestParam String pid){

        return Result.Success(solveService.getAllSolves(Long.parseLong(pid)),"获取题解列表成功");
    }
}
