package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.example.vnollxonlinejudge.model.dto.judge.SubmitCodeDTO;
import com.example.vnollxonlinejudge.model.dto.judge.TestCodeDTO;
import com.example.vnollxonlinejudge.model.vo.judge.JudgeResultVO;
import com.example.vnollxonlinejudge.service.JudgeService;
import com.example.vnollxonlinejudge.model.result.Result;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.vnollxonlinejudge.utils.UserContextHolder;

@RestController
@RequestMapping("/judge")
public class JudgeController {
    private final JudgeService judgeService;
    
    @Autowired
    public JudgeController(JudgeService judgeService) {
        this.judgeService = judgeService;
    }
    @PostMapping("/submit")
    @RequirePermission(PermissionCode.SUBMISSION_SUBMIT)
    public Result<JudgeResultVO> judgeSubmit(
            @RequestBody SubmitCodeDTO req
    ){
        Long userId = UserContextHolder.getCurrentUserId();
        JudgeResultVO result=judgeService.judgeSubmission(req,userId);
        return Result.Success(result,result.getStatus());
    }
    @PostMapping("/test")
    @RequirePermission(PermissionCode.SUBMISSION_SUBMIT)
    public Result<JudgeResultVO> test(
            @RequestBody TestCodeDTO req
    ){
        Long userId=UserContextHolder.getCurrentUserId();
        JudgeResultVO result=judgeService.testSubmission(req,userId);
        return Result.Success(result,result.getStatus());
    }
}
