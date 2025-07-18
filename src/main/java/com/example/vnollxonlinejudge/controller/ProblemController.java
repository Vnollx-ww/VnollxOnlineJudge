package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.service.ProblemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;
import com.example.vnollxonlinejudge.common.result.Result;
@RestController
@RequestMapping("/problem")
public class ProblemController {
    @Autowired
    private ProblemService problemService;
    @GetMapping("/{id}")
    public ModelAndView problemDetail(@PathVariable Long id) {
        ModelAndView modelAndView = new ModelAndView();
        Problem problem = problemService.getProblemInfo(id, 0);
        if (problem == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("problem", problem);
            modelAndView.setViewName("problem");
        }
        return modelAndView;
    }
    @PostMapping("/create")
    public Result createProblem(
            @RequestParam String title, @RequestParam String description,
            @RequestParam String timelimit,@RequestParam String memorylimit,
            @RequestParam String difficulty,@RequestParam String inputexample,
            @RequestParam String outputexample,@RequestParam String datazip
    ){
        problemService.createProblem(
                title,description,Integer.parseInt(timelimit),
                Integer.parseInt(memorylimit),difficulty,
                inputexample,outputexample,datazip
        );
        return Result.Success("创建题目成功");
    }
    @PostMapping("/delete")
    public Result deleteProblem(@RequestParam String id){
        problemService.deleteProblem(Long.parseLong(id));
        return Result.Success("删除题目成功");
    }
    @PostMapping("/get")
    public Result getProblemById(@RequestParam String id){
        return Result.Success(problemService.getProblemInfo(Long.parseLong(id),0),"获取题目信息成功");
    }
    @PostMapping("/update")
    public Result updateProblem(
            @RequestParam String id,@RequestParam String title,
            @RequestParam String description,@RequestParam String timelimit,
            @RequestParam String memorylimit,@RequestParam String difficulty,
            @RequestParam String inputexample,@RequestParam String outputexample,
            @RequestParam String datazip
    ){
        problemService.updateProblem(
                Long.parseLong(id),title,description,
                Integer.parseInt(timelimit),Integer.parseInt(memorylimit),
                difficulty,inputexample,outputexample,datazip
        );
        return Result.Success("更新题目信息成功");
    }
    @PostMapping("/getlist")
    public Result getProblemList(@RequestParam String offset,@RequestParam String size){
        return Result.Success(
                problemService.getProblemList(
                        Integer.parseInt(size)*Integer.parseInt(offset),Integer.parseInt(size)
                )
                ,"获取题目列表成功");
    }
    @PostMapping("/count")
    public Result getProblemCount(){
        return Result.Success(problemService.getProblemCount(),"获取题目总数成功");
    }
    @PostMapping("/gettags")
    public Result getTags(@RequestParam long pid){

        return Result.Success(problemService.getTagNames(pid),"获取题目标签成功");
    }
    @PostMapping("/search")
    public Result getProblemListByKeyWords(@RequestParam String keywords,@RequestParam String offset,@RequestParam String size){
        if(keywords != null && !keywords.isEmpty() && keywords.chars().allMatch(Character::isDigit)){
            return Result.Success(
                    problemService.getProblemListByKeywords(
                            keywords,Long.parseLong(keywords),
                            Integer.parseInt(offset),Integer.parseInt(size)
                    )
            ,"搜索题目成功");
        }else{
            return Result.Success(
                    problemService.getProblemListByKeywords(
                            keywords,0,Integer.parseInt(offset),Integer.parseInt(size)
                    )
                    ,"搜索题目成功");
        }
    }
    @PostMapping("/search/count")
    public Result getCountByKeyWords(@RequestParam String keywords){
        if(keywords != null && !keywords.isEmpty() && keywords.chars().allMatch(Character::isDigit)){
            return Result.Success(
                    problemService.getCountByKeywords(keywords,Long.parseLong(keywords))
                    ,"获取关键字题目总数成功");
        }else{
            return Result.Success(
                    problemService.getCountByKeywords(keywords,0)
                    ,"获取关键字题目总数成功");
        }
    }
}
