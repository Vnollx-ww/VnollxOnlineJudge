package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.Filter.BloomFilter;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.service.ProblemService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;
import com.example.vnollxonlinejudge.model.result.Result;

import java.util.List;

@RestController
@RequestMapping("/problem")
@RequiredArgsConstructor
public class ProblemController {
    private final ProblemService problemService;
    @Autowired private BloomFilter bloomFilter;
    @GetMapping("/{id}")
    public ModelAndView problemDetail(@PathVariable Long id) {
        if (!bloomFilter.contains(String.valueOf(id))){
            throw new BusinessException("题目不存在");
        }
        ModelAndView modelAndView = new ModelAndView();
        ProblemVo problem = problemService.getProblemInfo(id, 0L);
        if (problem == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("problem", problem);
            modelAndView.setViewName("problem");
        }
        return modelAndView;
    }
    @PostMapping("/get")
    public Result<ProblemVo> getProblemById(@RequestParam String id){
        return Result.Success(problemService.getProblemInfo(Long.parseLong(id),0L),"获取题目信息成功");
    }
    @GetMapping("/tags")
    public Result<List<String>> getTags(@RequestParam Long pid){

        return Result.Success(problemService.getTagNames(pid),"获取题目标签成功");
    }
    @GetMapping("/list")
    public Result<List<ProblemVo>> getProblemList(@RequestParam(required = false) String keyword, @RequestParam String offset, @RequestParam String size){
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
                            keyword,0L,Integer.parseInt(offset),Integer.parseInt(size),false
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
                    problemService.getCount(keyword,0L,false)
                    ,"获取关键字题目总数成功");
        }
    }
}
