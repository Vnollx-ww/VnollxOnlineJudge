package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.dto.request.admin.AdminSaveProblemRequest;
import com.example.vnollxonlinejudge.model.dto.response.problem.ProblemResponse;
import com.example.vnollxonlinejudge.service.ProblemService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/problem")
@Validated
public class AdminProblemController {
    @Autowired
    private ProblemService problemService;
    private Long getCurrentAdminId(HttpServletRequest request) {
        String userId = (String) request.getAttribute("uid");
        if (userId == null || userId.trim().isEmpty()) {
            throw new BusinessException("未获取到管理员ID");
        }

        try {
            return Long.parseLong(userId);
        } catch (NumberFormatException e) {
            throw new BusinessException("管理员ID格式错误");
        }
    }

    @PostMapping(value ="/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<Void> createProblem(
            @Valid @ModelAttribute AdminSaveProblemRequest request
    ) {
        problemService.createProblem(
                request.getTitle(),
                request.getDescription(),
                Integer.parseInt(request.getTimeLimit()),
                Integer.parseInt(request.getMemoryLimit()),
                request.getDifficulty(),
                request.getInputFormat(),
                request.getOutputFormat(),
                request.getInputExample(),
                request.getOutputExample(),
                request.getHint(),
                request.getOpen(),
                request.getTestCaseFile(),
                request.getTags()
        );
        return Result.Success("创建题目成功");
    }
    @DeleteMapping("/delete/{id}")
    public Result<Void> deleteProblem(@PathVariable @NotNull @Min(1) Long id){
        problemService.deleteProblemByAdmin(id);
        return Result.Success("删除题目成功");
    }
    @PutMapping("/update")
    public Result<Void> updateProblem(
            @Valid @ModelAttribute AdminSaveProblemRequest request
    ){
        problemService.updateProblem(
                request.getId(),
                request.getTitle(),
                request.getDescription(),
                Integer.parseInt(request.getTimeLimit()),
                Integer.parseInt(request.getMemoryLimit()),
                request.getDifficulty(),
                request.getInputFormat(),
                request.getOutputFormat(),
                request.getInputExample(),
                request.getOutputExample(),
                request.getHint(),
                request.getOpen(),
                request.getTestCaseFile(),
                request.getTags()
        );
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
                    problemService.getCount(keyword,0,true)
                    ,"获取关键字题目总数成功");
        }
    }
    @GetMapping("/list")
    public Result<List<ProblemResponse>> getProblemList(@RequestParam(required = false) String keyword,@RequestParam String offset,@RequestParam String size){
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
                            keyword,0,Integer.parseInt(offset),Integer.parseInt(size),true
                    )
                    ,"搜索题目成功");
        }
    }
}
