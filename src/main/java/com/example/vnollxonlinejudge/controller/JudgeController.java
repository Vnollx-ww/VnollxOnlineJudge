package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.dto.request.judge.SubmitCodeRequest;
import com.example.vnollxonlinejudge.service.JudgeService;
import jakarta.servlet.http.HttpServletRequest;
import com.example.vnollxonlinejudge.common.result.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/judge")
public class JudgeController {
    @Autowired
    private JudgeService judgeService;
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
    @PostMapping("/submit")
    public Result<String> judgeSubmit(
        @RequestBody SubmitCodeRequest req,HttpServletRequest request
    ){
        long userId = getCurrentUserId(request);
        String result=judgeService.judgeSubmit(
                req.getCode(),
                req.getOption(),
                Long.parseLong(req.getPid()),
                userId,
                Long.parseLong(req.getCid()),
                req.getCreate_time(),
                req.getUname(),
                Integer.parseInt(req.getTime()),
                Integer.parseInt(req.getMemory())
        );
        return Result.Success(result,result);
    }
}
