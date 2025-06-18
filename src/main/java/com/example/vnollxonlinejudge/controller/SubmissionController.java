package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.service.SubmissionService;
import com.example.vnollxonlinejudge.utils.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/submission")
public class SubmissionController {
    @Autowired
    private SubmissionService submissionService;
    @GetMapping("/{id}")
    public ModelAndView submissionDetail(@PathVariable Long id) {
        Result result = submissionService.getSubmissionById(id);
        ModelAndView modelAndView = new ModelAndView();
        if (result.getData() == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("submission", result.getData());
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
        return submissionService.createSubmission(user_name,problem_name,code,status,create_time,language,Long.parseLong(userId),Long.parseLong(pid),Integer.parseInt(time),Long.parseLong(cid));
    }
    @PostMapping("/getlist")
    public Result getSubmission(@RequestParam String offset,@RequestParam String size){
        return submissionService.getSubmission(Integer.parseInt(offset),Integer.parseInt(size));
    }
    @PostMapping("/getlistbyuid")
    public Result getSubmissionByUid(HttpServletRequest request, @RequestParam String offset, @RequestParam String size){
        String userId = (String) request.getAttribute("uid");
        return submissionService.getSubmissionByUid(Long.parseLong(userId),Integer.parseInt(offset),Integer.parseInt(size));
    }
    @PostMapping("/get")
    public Result getSubmissionById(@RequestParam String id){
        return submissionService.getSubmissionById(Long.parseLong(id));
    }
    @PostMapping("/count")
    public Result getSubmissionCount(HttpServletRequest request){
        String userId = (String) request.getAttribute("uid");
        return submissionService.getSubmissionCount(Long.parseLong(userId));
    }
    @PostMapping("/allcount")
    public Result getAllSubmissionCount(){
        return submissionService.getAllSubmissionCount();
    }
    @PostMapping("/search")
    public Result getSubmissionByStatusAndLanguage(@RequestParam String status,@RequestParam String language,@RequestParam String offset,@RequestParam String size){
        return submissionService.getSubmissionByStatusAndLanguage(status,language,Integer.parseInt(offset),Integer.parseInt(size));
    }
    @PostMapping("/search/count")
    public Result getCountByStatusAndLanguage(@RequestParam String status,@RequestParam String language){
        return submissionService.getCountByStatusAndLanguage(status,language);
    }
    @PostMapping("/countbycid")
    public Result getCountByCid(@RequestParam String cid){
        return submissionService.getSubmissionCountByCid(Long.parseLong(cid));
    }
    @PostMapping("/getlistbycid")
    public Result getSubmissionByCid(@RequestParam String cid,@RequestParam String offset,@RequestParam String size){
        return submissionService.getSubmissionByCid(Long.parseLong(cid),Integer.parseInt(offset),Integer.parseInt(size));
    }
}
