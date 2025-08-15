package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.dto.admin.AdminAddProblemDTO;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveCompetitionDTO;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionVo;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.service.CompetitionProblemService;
import com.example.vnollxonlinejudge.service.CompetitionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/competition")
@Validated
@RequiredArgsConstructor
public class AdminCompetitionController {
    private final CompetitionService competitionService;
    private final CompetitionProblemService competitionProblemService;
    @PostMapping("/create")
    public Result<Void> createCompetition(@RequestBody AdminSaveCompetitionDTO req){
        competitionService.createCompetition(req.getTitle(),req.getDescription(), req.getBeginTime(), req.getEndTime(), req.getPassword(), req.getNeedPassword());
        return Result.Success("创建比赛成功！！！");
    }
    @GetMapping("/list")
    public Result<List<CompetitionVo>> getCompetitionList(
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
    public Result<Void> deleteCompetition(@Valid @PathVariable Long id){
        competitionService.deleteCompetition(id);
        return Result.Success("删除比赛成功");
    }
    @PutMapping("/update")
    public Result<Void> updateCompetition(@RequestBody AdminSaveCompetitionDTO req){
        competitionService.updateCompetition(req.getId(),req.getTitle(),req.getDescription(),req.getBeginTime(),req.getEndTime(),req.getPassword(),req.getNeedPassword());
        return Result.Success("修改比赛信息成功");
    }
    @PostMapping("/add/problem")
    public Result<Void> addProblem(@RequestBody AdminAddProblemDTO req){
        competitionProblemService.addRecord(Long.parseLong(req.getPid()),Long.parseLong(req.getCid()));
        return Result.Success("添加题目至比赛中成功");
    }
}
