package com.example.vnollxonlinejudge.controller;

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
    @PostMapping("/submit")
    public Result judgeSubmit(
        @RequestParam String code, @RequestParam String option,
        @RequestParam String pid, @RequestParam String uname,
        HttpServletRequest request, @RequestParam String cid,
        @RequestParam String create_time,@RequestParam String time,
        @RequestParam String memory
    ){
        String userId = (String) request.getAttribute("uid");
        String result=judgeService.judgeSubmit(
                code,
                option,
                Long.parseLong(pid),
                Long.parseLong(userId),
                Long.parseLong(cid),
                create_time,
                uname,
                Integer.parseInt(time),
                Integer.parseInt(memory)
        );
        return Result.Success(result,result);
    }
}
