package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.domain.Submission;
import com.example.vnollxonlinejudge.service.SubmissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;
import com.example.vnollxonlinejudge.common.result.Result;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/submission")
public class SubmissionController {
    @Autowired
    private SubmissionService submissionService;
    @GetMapping("/{id}")
    public ModelAndView submissionDetail(@PathVariable Long id) {
        Submission submission = submissionService.getSubmissionById(id);
        ModelAndView modelAndView = new ModelAndView();
        if (submission == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("submission",submission);
            modelAndView.setViewName("submission");
        }
        return modelAndView;
    }
    @PostMapping("/create")
    public Result createSubmission(@RequestParam String user_name,@RequestParam String status,
                                   @RequestParam String create_time,@RequestParam String language,
                                   HttpServletRequest request, @RequestParam String pid,
                                   @RequestParam String time,@RequestParam String problem_name,
                                   @RequestParam String code,@RequestParam String cid
    ){
        String userId = (String) request.getAttribute("uid");
        submissionService.createSubmission(user_name,problem_name,code,status,create_time,language,Long.parseLong(userId),Long.parseLong(pid),Integer.parseInt(time),Long.parseLong(cid));
        return Result.Success("创建提交记录成功");
    }
    @PostMapping("/getlist")
    public Result getSubmission(@RequestParam String offset,@RequestParam String size){
        return  Result.Success(submissionService.getSubmission(Integer.parseInt(offset),Integer.parseInt(size))
                ,"获取提交记录列表成功");
    }
    @PostMapping("/getlistbyuid")
    public Result getSubmissionByUid(HttpServletRequest request, @RequestParam String offset, @RequestParam String size){
        String userId = (String) request.getAttribute("uid");
        return  Result.Success(
                submissionService.getSubmissionByUid(Long.parseLong(userId),Integer.parseInt(offset),Integer.parseInt(size))
                ,"获取提交记录列表成功");
    }
    @PostMapping("/get")
    public Result getSubmissionById(@RequestParam String id){
        return Result.Success(submissionService.getSubmissionById(Long.parseLong(id)),"获取提交记录成功");
    }
    @PostMapping("/count")
    public Result getSubmissionCount(HttpServletRequest request){
        String userId = (String) request.getAttribute("uid");
        return Result.Success(submissionService.getSubmissionCount(Long.parseLong(userId))
                ,"获取提交记录总数成功");
    }
    @PostMapping("/allcount")
    public Result getAllSubmissionCount(){

        return Result.Success(submissionService.getAllSubmissionCount(),"获取提交记录总数成功");
    }
    @PostMapping("/search")
    public Result getSubmissionByStatusAndLanguage(@RequestParam String status,@RequestParam String language,@RequestParam String offset,@RequestParam String size){
        return Result.Success(submissionService.getSubmissionByStatusAndLanguage(status,language,Integer.parseInt(offset),Integer.parseInt(size))
                ,"筛选提交记录列表成功");
    }
    @PostMapping("/search/count")
    public Result getCountByStatusAndLanguage(@RequestParam String status,@RequestParam String language){
        return Result.Success(submissionService.getCountByStatusAndLanguage(status,language),"获取筛选总数成功");
    }
    @PostMapping("/countbycid")
    public Result getCountByCid(@RequestParam String cid){
        return Result.Success(submissionService.getSubmissionCountByCid(Long.parseLong(cid)),"获取比赛提交总数成功");
    }
    @PostMapping("/getlistbycid")
    public Result getSubmissionByCid(@RequestParam String cid,@RequestParam String offset,@RequestParam String size){
        return Result.Success(submissionService.getSubmissionByCid(Long.parseLong(cid),Integer.parseInt(offset),Integer.parseInt(size)),"获取比赛提交列表成功");
    }
}
