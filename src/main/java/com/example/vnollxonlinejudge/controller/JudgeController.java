package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.dto.judge.SubmitCodeDTO;
import com.example.vnollxonlinejudge.model.dto.judge.TestCodeDTO;
import com.example.vnollxonlinejudge.service.JudgeService;
import com.example.vnollxonlinejudge.model.result.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import com.example.vnollxonlinejudge.utils.UserContextHolder;

@RestController
@RequestMapping("/judge")
@RequiredArgsConstructor
public class JudgeController {
    private final JudgeService judgeService;
    @PostMapping("/submit")
    public Result<String> judgeSubmit(
            @RequestBody SubmitCodeDTO req
    ){
        Long userId = UserContextHolder.getCurrentUserId();
        String result=judgeService.judgeSubmission(req,userId);
        return Result.Success(result,result);
    }
    @PostMapping("/test")
    public Result<String> test(
            @RequestBody TestCodeDTO req
    ){
        String result=judgeService.testSubmission(req);
        return Result.Success(result,result);
    }
}
