package com.example.vnollxonlinejudge.controller;

import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.model.dto.request.admin.AdminSaveCompetitionRequest;
import com.example.vnollxonlinejudge.model.dto.request.competition.AddProblemRequest;
import com.example.vnollxonlinejudge.model.dto.response.competition.CompetitionResponse;
import com.example.vnollxonlinejudge.service.CompetitionProblemService;
import com.example.vnollxonlinejudge.service.CompetitionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/competition")
@Validated
public class AdminCompetitionController {
    @Autowired
    private CompetitionService competitionService;
    @Autowired
    private CompetitionProblemService competitionProblemService;
    @PostMapping("/create")
    public Result<Void> createCompetition(@RequestBody AdminSaveCompetitionRequest req){
        competitionService.createCompetition(req.getTitle(),req.getDescription(), req.getBeginTime(), req.getEndTime(), req.getPassword(),req.isNeedPassword());
        return Result.Success("创建比赛成功！！！");
    }
    @GetMapping("/list")
    public Result<List<CompetitionResponse>> getCompetitionList(
            @RequestParam String pageNum,@RequestParam String pageSize,
            @RequestParam(required = false) String keyword
    ){
        return Result.Success(competitionService.getCompetitionList(Integer.parseInt(pageNum),Integer.parseInt(pageSize),keyword)
                , "获取比赛列表成功！！！");
    }
    @GetMapping("/count")
    public Result<Long> getCount(@RequestParam(required = false) String keyword){
        return Result.Success(competitionService.getCount(keyword),"获取比赛总数成功");
    }
    @DeleteMapping("/delete/{id}")
    public Result<Void> deleteCompetition(@Valid @PathVariable long id){
        competitionService.deleteCompetition(id);
        return Result.Success("删除比赛成功");
    }
    @PutMapping("/update")
    public Result<Void> updateCompetition(@RequestBody AdminSaveCompetitionRequest req){
        competitionService.updateCompetition(req.getId(),req.getTitle(),req.getDescription(),req.getBeginTime(),req.getEndTime(),req.getPassword(),req.isNeedPassword());
        return Result.Success("修改比赛信息成功");
    }
    @PostMapping("/add/problem")
    public Result<Void> addProblem(@RequestBody AddProblemRequest req){
        competitionProblemService.addRecord(Long.parseLong(req.getPid()),Long.parseLong(req.getCid()));
        return Result.Success("添加题目至比赛中成功");
    }
}
