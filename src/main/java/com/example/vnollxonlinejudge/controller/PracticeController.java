package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.practice.PracticeVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.service.PracticeService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/practice")
public class PracticeController {
    
    private final PracticeService practiceService;
    
    @Autowired
    public PracticeController(PracticeService practiceService) {
        this.practiceService = practiceService;
    }
    
    @GetMapping("/list")
    public Result<List<PracticeVo>> getPracticeList() {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(practiceService.getPublicPracticeList(userId), "获取练习列表成功");
    }
    
    @GetMapping("/{id}")
    public Result<PracticeVo> getPracticeById(@PathVariable Long id) {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(practiceService.getPracticeById(id, userId), "获取练习详情成功");
    }
    
    @GetMapping("/{id}/problems")
    public Result<List<ProblemVo>> getProblemList(@PathVariable Long id) {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(practiceService.getProblemList(id, userId), "获取练习题目列表成功");
    }
    
    @GetMapping("/count")
    public Result<Long> getPracticeCount() {
        return Result.Success(practiceService.getCount(null), "获取练习数量成功");
    }
}
