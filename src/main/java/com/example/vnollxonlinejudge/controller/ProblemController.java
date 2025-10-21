package com.example.vnollxonlinejudge.controller;

import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.example.vnollxonlinejudge.filter.BloomFilter;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.serviceImpl.AiServiceImpl;
import com.example.vnollxonlinejudge.utils.UrlDecodedUtil;
import org.checkerframework.checker.units.qual.N;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;
import com.example.vnollxonlinejudge.model.result.Result;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/problem")
public class ProblemController {
    private static final Logger logger = LoggerFactory.getLogger(ProblemController.class);
    private final ProblemService problemService;
    private final BloomFilter bloomFilter;
    
    @Autowired
    public ProblemController(
            ProblemService problemService,
            BloomFilter bloomFilter
    ) {
        this.bloomFilter = bloomFilter;
        this.problemService = problemService;
    }

    @GetMapping("/{id}")
    public ModelAndView problemDetail(@PathVariable Long id) {
        if (!bloomFilter.contains(String.valueOf(id))){
            throw new BusinessException("题目不存在");
        }
        ModelAndView modelAndView = new ModelAndView();
        ProblemVo problem = problemService.getProblemInfo(id, 0L,null);
        if (problem == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("problem", problem);
            modelAndView.setViewName("problem");
        }
        return modelAndView;
    }
    @GetMapping("/get")
    public Result<ProblemVo> getProblemById(@RequestParam(required = false) String id,@RequestParam(required = false) String name){
        Long pid=null;
        if (StringUtils.isNotBlank(id)){
            pid=Long.parseLong(id);
        }
        // 解码URL编码
        String decodedName = UrlDecodedUtil.decodedUrl(name);
        return Result.Success(problemService.getProblemInfo(pid,0L,decodedName),"获取题目信息成功");
    }
    @GetMapping("/tags")
    public Result<List<String>> getTags(@RequestParam Long pid){

        return Result.Success(problemService.getTagNames(pid),"获取题目标签成功");
    }
    @GetMapping("/list")
    public Result<List<ProblemVo>> getProblemList(@RequestParam(required = false) String keyword, @RequestParam String offset, @RequestParam String size){
        if(keyword != null && !keyword.isEmpty() && keyword.chars().allMatch(Character::isDigit)){
            return Result.Success(
                    problemService.getProblemList(
                            keyword,Long.parseLong(keyword),
                            Integer.parseInt(offset),Integer.parseInt(size),false
                    )
            ,"搜索题目成功");
        }else{
            return Result.Success(
                    problemService.getProblemList(
                            keyword,0L,Integer.parseInt(offset),Integer.parseInt(size),false
                    )
                    ,"搜索题目成功");
        }
    }
    @GetMapping("/count")
    public Result<Long> getCount(@RequestParam(required = false) String keyword){
        if(keyword != null && !keyword.isEmpty() && keyword.chars().allMatch(Character::isDigit)){
            return Result.Success(
                    problemService.getCount(keyword,Long.parseLong(keyword),false)
                    ,"获取关键字题目总数成功");
        }else{
            return Result.Success(
                    problemService.getCount(keyword,0L,false)
                    ,"获取关键字题目总数成功");
        }
    }
}
