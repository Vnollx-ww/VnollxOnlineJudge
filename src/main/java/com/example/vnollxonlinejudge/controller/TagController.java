package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.tag.TagVo;
import com.example.vnollxonlinejudge.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tag")
public class TagController {
    private final TagService tagService;
    
    @Autowired
    public TagController(TagService tagService) {
        this.tagService = tagService;
    }
    @GetMapping("/list")
    public Result<List<TagVo>> getTagList(){
        return Result.Success(tagService.getTagList(),"获取标签列表成功");
    }
}
