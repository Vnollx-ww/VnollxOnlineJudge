package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.utils.Result;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.mybatis.logging.Logger;
import org.mybatis.logging.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import jakarta.servlet.http.HttpServletRequest;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

@RestController
@RequestMapping("/problem")
public class ProblemController {
    @Autowired
    private ProblemService problemService;
    @GetMapping("/{id}")
    public ModelAndView problemDetail(@PathVariable Long id) {
        ModelAndView modelAndView = new ModelAndView();
        Result result = problemService.getProblemInfo(id, 0);
        Problem problem = (Problem) result.getData();
        if (problem == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("problem", problem);
            modelAndView.setViewName("problem");
        }
        return modelAndView;
    }
    @PostMapping("/create")
    public Result createProblem(@RequestParam String title, @RequestParam String description,@RequestParam String timelimit,@RequestParam String memorylimit,@RequestParam String difficulty,@RequestParam String inputexample,@RequestParam String outputexample,@RequestParam String datazip){
        return problemService.createProblem(title,description,Integer.parseInt(timelimit),Integer.parseInt(memorylimit),difficulty,inputexample,outputexample,datazip);
    }
    @PostMapping("/delete")
    public Result deleteProblem(@RequestParam String id){
        return problemService.deleteProblem(Long.parseLong(id));
    }
    @PostMapping("/get")
    public Result getProblemById(@RequestParam String id){
        return problemService.getProblemInfo(Long.parseLong(id),0);
    }
    @PostMapping("/submit")
    public Result submitCodeToProblem(
            @RequestParam String code,
            @RequestParam String option,
            @RequestParam String pid,
            @RequestParam String uname,
            HttpServletRequest request,
            @RequestParam String cid,
            @RequestParam String create_time // 直接接收字符串
    ) {
        String userId = (String) request.getAttribute("uid");
        return problemService.submitCodeToProblem(
                code,
                option,
                Long.parseLong(pid),
                Long.parseLong(userId),
                Long.parseLong(cid),
                create_time,
                uname
        );
    }
    @PostMapping("/update")
    public Result updateProblem(@RequestParam String id,@RequestParam String title, @RequestParam String description,@RequestParam String timelimit,@RequestParam String memorylimit,@RequestParam String difficulty,@RequestParam String inputexample,@RequestParam String outputexample,@RequestParam String datazip){
        return problemService.updateProblem(Long.parseLong(id),title,description,Integer.parseInt(timelimit),Integer.parseInt(memorylimit),difficulty,inputexample,outputexample,datazip);
    }
    @PostMapping("/getlist")
    public Result getProblemList(@RequestParam String offset,@RequestParam String size){
        return problemService.getProblemList(Integer.parseInt(size)*Integer.parseInt(offset),Integer.parseInt(size));
    }
    @PostMapping("/count")
    public Result getProblemCount(){
        return problemService.getProblemCount();
    }
    @PostMapping("/gettags")
    public Result getTags(@RequestParam long pid){
        return problemService.getTagNames(pid);
    }
    @PostMapping("/search")
    public Result getProblemListByKeyWords(@RequestParam String keywords,@RequestParam String offset,@RequestParam String size){
        if(keywords != null && !keywords.isEmpty() && keywords.chars().allMatch(Character::isDigit)){
            return problemService.getProblemListByKeywords(keywords,Long.parseLong(keywords),Integer.parseInt(offset),Integer.parseInt(size));
        }else{
            return problemService.getProblemListByKeywords(keywords,0,Integer.parseInt(offset),Integer.parseInt(size));
        }
    }
    @PostMapping("/search/count")
    public Result getCountByKeyWords(@RequestParam String keywords){
        if(keywords != null && !keywords.isEmpty() && keywords.chars().allMatch(Character::isDigit)){
            return problemService.getCountByKeywords(keywords,Long.parseLong(keywords));
        }else{
            return problemService.getCountByKeywords(keywords,0);
        }
    }
}
