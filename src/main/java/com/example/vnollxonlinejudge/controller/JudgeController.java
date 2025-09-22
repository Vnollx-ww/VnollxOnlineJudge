package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.dto.judge.SubmitCodeDTO;
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
        String result=judgeService.judgeSubmission(
                req.getCode(),
                req.getOption(),
                Long.parseLong(req.getPid()),
                userId,
                Long.parseLong(req.getCid()),
                req.getCreate_time(),
                req.getUname(),
                Long.parseLong(req.getTime()),
                Long.parseLong(req.getMemory())
        );
        return Result.Success(result,result);
    }
}
