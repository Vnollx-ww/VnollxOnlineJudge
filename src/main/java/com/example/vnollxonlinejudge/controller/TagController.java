package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.tag.TagVo;
import com.example.vnollxonlinejudge.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tag")
@RequiredArgsConstructor
public class TagController {
    private final TagService tagService;
    @GetMapping("/list")
    public Result<List<TagVo>> getTagList(){
        return Result.Success(tagService.getTagList(),"获取标签列表成功");
    }
}
