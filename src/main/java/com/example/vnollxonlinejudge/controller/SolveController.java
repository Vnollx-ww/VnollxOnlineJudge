package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.dto.request.solve.CreateSolveRequest;
import com.example.vnollxonlinejudge.model.dto.response.problem.ProblemResponse;
import com.example.vnollxonlinejudge.model.dto.response.solve.SolveResponse;
import com.example.vnollxonlinejudge.model.entity.Problem;
import com.example.vnollxonlinejudge.model.entity.Solve;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.SolveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;
import com.example.vnollxonlinejudge.common.result.Result;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

@RestController
@RequestMapping("/solve")
public class SolveController {
    @Autowired
    private SolveService solveService;
    @Autowired
    private ProblemService problemService;
    private Long getCurrentUserId(HttpServletRequest request) {
        String userId = (String) request.getAttribute("uid");
        if (userId == null || userId.trim().isEmpty()) {
            throw new BusinessException("未获取到用户ID");
        }
        try {
            return Long.parseLong(userId);
        } catch (NumberFormatException e) {
            throw new BusinessException("用户ID格式错误");
        }
    }
    @GetMapping("/{id}")
    public ModelAndView solveDetail(@PathVariable Long id) {
        SolveResponse solve= solveService.getSolve(id);
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
        ProblemResponse problem = problemService.getProblemInfo(id,0);
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
        ProblemResponse problem = problemService.getProblemInfo(id,0);
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
    public Result<Void> createSolve(@RequestBody CreateSolveRequest req,HttpServletRequest request){
        long userId=getCurrentUserId(request);
        solveService.createSolve(
                req.getContent(),
                req.getName(),
                Long.parseLong(req.getPid()),
                userId,
                req.getTitle(),
                req.getProblemName()
        );
        return Result.Success("创建题解成功");
    }
    @GetMapping("/list")
    public Result<List<SolveResponse>> getAllSolves(@RequestParam String pid){

        return Result.Success(solveService.getAllSolves(Long.parseLong(pid)),"获取题解列表成功");
    }
}
