package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveProblemDTO;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.service.ProblemService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/problem")
@Validated
public class AdminProblemController {
    private final ProblemService problemService;
    
    @Autowired
    public AdminProblemController(ProblemService problemService) {
        this.problemService = problemService;
    }
    @PostMapping(value ="/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<Void> createProblem(
            @Valid @ModelAttribute AdminSaveProblemDTO dto
    ) {
        problemService.createProblem(dto);
        return Result.Success("创建题目成功");
    }
    @DeleteMapping("/delete/{id}")
    public Result<Void> deleteProblem(@PathVariable @NotNull @Min(1) Long id){
        problemService.deleteProblemByAdmin(id);
        return Result.Success("删除题目成功");
    }
    @PutMapping("/update")
    public Result<Void> updateProblem(
            @Valid @ModelAttribute AdminSaveProblemDTO dto
    ){
        problemService.updateProblem(dto);
        return Result.Success("更新题目信息成功");
    }
    @GetMapping("/count")
    public Result<Long> getProblemCount(@RequestParam(required = false) String keyword){
        if(keyword != null && !keyword.isEmpty() && keyword.chars().allMatch(Character::isDigit)){
            return Result.Success(
                    problemService.getCount(keyword,Long.parseLong(keyword),true)
                    ,"获取关键字题目总数成功");
        }else{
            return Result.Success(
                    problemService.getCount(keyword,0L,true)
                    ,"获取关键字题目总数成功");
        }
    }
    @GetMapping("/list")
    public Result<List<ProblemVo>> getProblemList(@RequestParam(required = false) String keyword, @RequestParam String offset, @RequestParam String size){
        if(keyword != null && !keyword.isEmpty() && keyword.chars().allMatch(Character::isDigit)){
            return Result.Success(
                    problemService.getProblemList(
                            keyword,Long.parseLong(keyword),
                            Integer.parseInt(offset),Integer.parseInt(size),true
                    )
                    ,"搜索题目成功");
        }else{
            return Result.Success(
                    problemService.getProblemList(
                            keyword,0L,Integer.parseInt(offset),Integer.parseInt(size),true
                    )
                    ,"搜索题目成功");
        }
    }
}
