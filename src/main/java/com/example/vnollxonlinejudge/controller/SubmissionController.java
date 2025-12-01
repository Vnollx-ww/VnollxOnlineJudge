package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.query.SubmissionQuery;
import com.example.vnollxonlinejudge.model.vo.submission.SubmissionVo;
import com.example.vnollxonlinejudge.service.SubmissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.vnollxonlinejudge.model.result.Result;

import java.util.List;

@RestController
@RequestMapping("/submission")
public class SubmissionController {
    private final SubmissionService submissionService;
    
    @Autowired
    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @GetMapping("/get")
    public Result<SubmissionVo> getSubmissionById(@RequestParam String id){
        return Result.Success(submissionService.getSubmissionById(Long.parseLong(id)),"获取提交记录成功");
    }
    @GetMapping("/list")
    public Result<List<SubmissionVo>> getSubmissionList(
             SubmissionQuery submissionQuery
    ){
        return Result.Success(
                submissionService.getSubmissionList(submissionQuery)
        ,"获取提交记录列表成功");
    }
    @GetMapping("/count")
    public Result<Long> getSubmissionCount(
             SubmissionQuery submissionQuery
    ){
        return Result.Success(submissionService.getCount(submissionQuery),"获取提交记录列表成功");
    }
}
