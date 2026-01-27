package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.example.vnollxonlinejudge.model.dto.admin.AdminAddProblemDTO;
import com.example.vnollxonlinejudge.model.dto.admin.AdminBatchAddProblemDTO;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveCompetitionDTO;
import com.example.vnollxonlinejudge.model.entity.CompetitionProblem;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemBasicVo;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.service.CompetitionProblemService;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.ProblemService;
import jakarta.validation.Valid;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/competition")
@Validated
public class AdminCompetitionController {
    private final CompetitionService competitionService;
    private final CompetitionProblemService competitionProblemService;
    private final ProblemService problemService;
    
    @Autowired
    public AdminCompetitionController(
            CompetitionService competitionService,
            CompetitionProblemService competitionProblemService,
            ProblemService problemService
    ) {
        this.competitionService = competitionService;
        this.competitionProblemService = competitionProblemService;
        this.problemService = problemService;
    }

    @PostMapping("/create")
    @RequirePermission(PermissionCode.COMPETITION_CREATE)
    public Result<Void> createCompetition(@RequestBody AdminSaveCompetitionDTO req){
        competitionService.createCompetition(req.getTitle(),req.getDescription(), req.getBeginTime(), req.getEndTime(), req.getPassword(), req.getNeedPassword());
        return Result.Success("创建比赛成功！！！");
    }
    @GetMapping("/list")
    @RequirePermission(PermissionCode.COMPETITION_VIEW)
    public Result<List<CompetitionVo>> getCompetitionList(
            @RequestParam String pageNum,@RequestParam String pageSize,
            @RequestParam(required = false) String keyword
    ){
        return Result.Success(competitionService.getCompetitionList(Integer.parseInt(pageNum),Integer.parseInt(pageSize),keyword)
                , "获取比赛列表成功！！！");
    }
    @GetMapping("/count")
    @RequirePermission(PermissionCode.COMPETITION_VIEW)
    public Result<Long> getCount(@RequestParam(required = false) String keyword){
        return Result.Success(competitionService.getCount(keyword),"获取比赛总数成功");
    }
    @DeleteMapping("/delete/{id}")
    @RequirePermission(PermissionCode.COMPETITION_DELETE)
    public Result<Void> deleteCompetition(@Valid @PathVariable Long id){
        competitionService.deleteCompetition(id);
        return Result.Success("删除比赛成功");
    }
    @PutMapping("/update")
    @RequirePermission(PermissionCode.COMPETITION_UPDATE)
    public Result<Void> updateCompetition(@RequestBody AdminSaveCompetitionDTO req){
        competitionService.updateCompetition(req.getId(),req.getTitle(),req.getDescription(),req.getBeginTime(),req.getEndTime(),req.getPassword(),req.getNeedPassword());
        return Result.Success("修改比赛信息成功");
    }
    @PostMapping("/add/problem")
    @RequirePermission(PermissionCode.COMPETITION_UPDATE)
    public Result<Void> addProblem(@RequestBody AdminAddProblemDTO req){
        competitionProblemService.addRecord(Long.parseLong(req.getPid()),Long.parseLong(req.getCid()));
        return Result.Success("添加题目至比赛中成功");
    }
    
    @GetMapping("/problems")
    public Result<List<ProblemBasicVo>> getAllProblems(){
        List<ProblemBasicVo> problems = problemService.getAllProblemBasicInfo();
        return Result.Success(problems, "获取题目列表成功");
    }
    
    @PostMapping("/add/problems/batch")
    @RequirePermission(PermissionCode.COMPETITION_UPDATE)
    public Result<Void> batchAddProblems(@RequestBody AdminBatchAddProblemDTO req){
        Long cid = Long.parseLong(req.getCid());
        for (String pid : req.getPids()) {
            competitionProblemService.addRecord(Long.parseLong(pid), cid);
        }
        return Result.Success("批量添加题目至比赛中成功");
    }
    
    @DeleteMapping("/{cid}/problems/{pid}")
    @RequirePermission(PermissionCode.COMPETITION_UPDATE)
    public Result<Void> deleteProblemFromCompetition(@PathVariable Long cid, @PathVariable Long pid){
        competitionProblemService.deleteProblemFromCompetition(pid, cid);
        return Result.Success("从比赛中删除题目成功");
    }
    
    @GetMapping("/{cid}/problems")
    @RequirePermission(PermissionCode.COMPETITION_VIEW)
    public Result<List<ProblemBasicVo>> getCompetitionProblems(@PathVariable Long cid){
        List<CompetitionProblem> competitionProblems = competitionProblemService.getProblemList(cid);
        List<ProblemBasicVo> problems = competitionProblems.stream()
                .map(cp -> {
                    ProblemVo problemVo = problemService.getProblemInfo(cp.getProblemId(), cid, null);
                    return new ProblemBasicVo(problemVo.getId(), problemVo.getTitle(), problemVo.getDifficulty());
                })
                .collect(java.util.stream.Collectors.toList());
        return Result.Success(problems, "获取比赛题目列表成功");
    }
}
