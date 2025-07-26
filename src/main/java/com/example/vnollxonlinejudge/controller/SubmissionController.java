package com.example.vnollxonlinejudge.controller;

import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.example.vnollxonlinejudge.model.dto.response.submission.SubmissionResponse;
import com.example.vnollxonlinejudge.service.SubmissionService;
import com.example.vnollxonlinejudge.utils.Jwt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;
import com.example.vnollxonlinejudge.common.result.Result;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/submission")
public class SubmissionController {
    @Autowired
    private SubmissionService submissionService;
    @GetMapping("/{id}")
    public ModelAndView submissionDetail(@PathVariable Long id) {
        SubmissionResponse submission = submissionService.getSubmissionById(id);
        ModelAndView modelAndView = new ModelAndView();
        if (submission == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("submission",submission);
            modelAndView.setViewName("submission");
        }
        return modelAndView;
    }
    @GetMapping("/get")
    public Result<SubmissionResponse> getSubmissionById(@RequestParam String id){
        return Result.Success(submissionService.getSubmissionById(Long.parseLong(id)),"获取提交记录成功");
    }
    @GetMapping("/list")
    public Result<List<SubmissionResponse>> getSubmissionList(
            @RequestParam(required = false) String cid,
            @RequestParam(required = false) String uid,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String status,
            @RequestParam String pageNum,
            @RequestParam String pageSize
    ){
        long uidLong = 0;
        long cidLong = parseLongOrDefault(cid); // 默认值0
        if (StringUtils.isNotBlank(uid)){
            uidLong= Long.parseLong(Objects.requireNonNull(Jwt.getUserIdFromToken(uid)));
        }
        return Result.Success(
                submissionService.getSubmissionList(
                        cidLong,
                        uidLong,
                        language,
                        status,
                        Integer.parseInt(pageNum),
                        Integer.parseInt(pageSize)
                )
        ,"获取提交记录列表成功");
    }
    @GetMapping("/count")
    public Result<Long> getSubmissionCount(
            @RequestParam(required = false) String cid,
            @RequestParam(required = false) String uid,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String status
    ){
        long uidLong = 0;
        long cidLong = parseLongOrDefault(cid); // 默认值0
        if (StringUtils.isNotBlank(uid)){
            uidLong= Long.parseLong(Objects.requireNonNull(Jwt.getUserIdFromToken(uid)));
        }

        // 调用服务方法
        return Result.Success(
                submissionService.getCount(cidLong, uidLong, language, status)
                ,"获取提交记录列表成功");
    }
    private long parseLongOrDefault(String value) {
        if (value == null || value.trim().isEmpty()) {
            return 0L;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
