package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.service.CompetitionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/competition")
@Validated
public class AdminCompetitionController {
    @Autowired
    private CompetitionService competitionService;
    @PostMapping("/create")
    public Result<Void> createCompetition(@RequestParam String title, @RequestParam String description, @RequestParam String begin_time, @RequestParam String end_time, @RequestParam String password){
        competitionService.createCompetition(title,description,begin_time,end_time,password);
        return Result.Success("创建比赛成功！！！");
    }
}
