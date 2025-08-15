package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.dto.judge.SubmitCodeDTO;
import com.example.vnollxonlinejudge.service.JudgeService;
import jakarta.servlet.http.HttpServletRequest;
import com.example.vnollxonlinejudge.model.result.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/judge")
@RequiredArgsConstructor
public class JudgeController {
    private final JudgeService judgeService;
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
            @RequestBody SubmitCodeDTO req, HttpServletRequest request
    ){
        Long userId = getCurrentUserId(request);
        String result=judgeService.judgeSubmit(
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
