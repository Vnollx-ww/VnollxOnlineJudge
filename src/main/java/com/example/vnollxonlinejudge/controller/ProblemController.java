package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.dto.response.problem.ProblemResponse;
import com.example.vnollxonlinejudge.model.entity.Problem;
import com.example.vnollxonlinejudge.service.ProblemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.ModelAndView;
import com.example.vnollxonlinejudge.common.result.Result;

import java.util.List;

@RestController
@RequestMapping("/problem")
public class ProblemController {
    @Autowired
    private ProblemService problemService;
    @GetMapping("/{id}")
    public ModelAndView problemDetail(@PathVariable Long id) {
        ModelAndView modelAndView = new ModelAndView();
        ProblemResponse problem = problemService.getProblemInfo(id, 0);
        if (problem == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("problem", problem);
            modelAndView.setViewName("problem");
        }
        return modelAndView;
    }
    @PostMapping("/get")
    public Result<ProblemResponse> getProblemById(@RequestParam String id){
        return Result.Success(problemService.getProblemInfo(Long.parseLong(id),0),"获取题目信息成功");
    }
    @GetMapping("/tags")
    public Result<List<String>> getTags(@RequestParam long pid){

        return Result.Success(problemService.getTagNames(pid),"获取题目标签成功");
    }
    @GetMapping("/list")
    public Result<List<ProblemResponse>> getProblemList(@RequestParam(required = false) String keyword,@RequestParam String offset,@RequestParam String size){
        if(keyword != null && !keyword.isEmpty() && keyword.chars().allMatch(Character::isDigit)){
            return Result.Success(
                    problemService.getProblemList(
                            keyword,Long.parseLong(keyword),
                            Integer.parseInt(offset),Integer.parseInt(size),false
                    )
            ,"搜索题目成功");
        }else{
            return Result.Success(
                    problemService.getProblemList(
                            keyword,0,Integer.parseInt(offset),Integer.parseInt(size),false
                    )
                    ,"搜索题目成功");
        }
    }
    @GetMapping("/count")
    public Result<Long> getCount(@RequestParam(required = false) String keyword){
        if(keyword != null && !keyword.isEmpty() && keyword.chars().allMatch(Character::isDigit)){
            return Result.Success(
                    problemService.getCount(keyword,Long.parseLong(keyword),false)
                    ,"获取关键字题目总数成功");
        }else{
            return Result.Success(
                    problemService.getCount(keyword,0,false)
                    ,"获取关键字题目总数成功");
        }
    }
}
