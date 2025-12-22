package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.dto.admin.AdminAddPracticeProblemDTO;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSavePracticeDTO;
import com.example.vnollxonlinejudge.model.entity.PracticeProblem;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.practice.PracticeVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemBasicVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.service.PracticeProblemService;
import com.example.vnollxonlinejudge.service.PracticeService;
import com.example.vnollxonlinejudge.service.ProblemService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/practice")
@Validated
public class AdminPracticeController {
    
    private final PracticeService practiceService;
    private final PracticeProblemService practiceProblemService;
    private final ProblemService problemService;
    
    @Autowired
    public AdminPracticeController(
            PracticeService practiceService,
            PracticeProblemService practiceProblemService,
            ProblemService problemService
    ) {
        this.practiceService = practiceService;
        this.practiceProblemService = practiceProblemService;
        this.problemService = problemService;
    }
    
    @PostMapping("/create")
    public Result<Void> createPractice(@RequestBody AdminSavePracticeDTO req) {
        practiceService.createPractice(req.getTitle(), req.getDescription(), req.getIsPublic());
        return Result.Success("创建练习成功");
    }
    
    @GetMapping("/list")
    public Result<List<PracticeVo>> getPracticeList(
            @RequestParam String pageNum,
            @RequestParam String pageSize,
            @RequestParam(required = false) String keyword
    ) {
        return Result.Success(
                practiceService.getPracticeList(Integer.parseInt(pageNum), Integer.parseInt(pageSize), keyword),
                "获取练习列表成功"
        );
    }
    
    @GetMapping("/count")
    public Result<Long> getCount(@RequestParam(required = false) String keyword) {
        return Result.Success(practiceService.getCount(keyword), "获取练习总数成功");
    }
    
    @DeleteMapping("/delete/{id}")
    public Result<Void> deletePractice(@Valid @PathVariable Long id) {
        practiceService.deletePractice(id);
        return Result.Success("删除练习成功");
    }
    
    @PutMapping("/update")
    public Result<Void> updatePractice(@RequestBody AdminSavePracticeDTO req) {
        practiceService.updatePractice(req.getId(), req.getTitle(), req.getDescription(), req.getIsPublic());
        return Result.Success("修改练习信息成功");
    }
    
    @GetMapping("/problems")
    public Result<List<ProblemBasicVo>> getAllProblems() {
        List<ProblemBasicVo> problems = problemService.getAllProblemBasicInfo();
        return Result.Success(problems, "获取题目列表成功");
    }
    
    @PostMapping("/add/problems")
    public Result<Void> addProblems(@RequestBody AdminAddPracticeProblemDTO req) {
        Long practiceId = Long.parseLong(req.getPracticeId());
        List<Long> problemIds = req.getProblemIds().stream()
                .map(Long::parseLong)
                .collect(Collectors.toList());
        practiceProblemService.addProblems(practiceId, problemIds);
        return Result.Success("添加题目至练习成功");
    }
    
    @DeleteMapping("/{practiceId}/problems/{problemId}")
    public Result<Void> deleteProblemFromPractice(@PathVariable Long practiceId, @PathVariable Long problemId) {
        practiceProblemService.deleteProblem(practiceId, problemId);
        return Result.Success("从练习中删除题目成功");
    }
    
    @GetMapping("/{practiceId}/problems")
    public Result<List<ProblemBasicVo>> getPracticeProblems(@PathVariable Long practiceId) {
        List<PracticeProblem> practiceProblems = practiceProblemService.getProblemList(practiceId);
        List<ProblemBasicVo> problems = practiceProblems.stream()
                .map(pp -> {
                    ProblemVo problemVo = problemService.getProblemInfo(pp.getProblemId(), 0L, null);
                    return new ProblemBasicVo(problemVo.getId(), problemVo.getTitle(), problemVo.getDifficulty());
                })
                .collect(Collectors.toList());
        return Result.Success(problems, "获取练习题目列表成功");
    }
}
