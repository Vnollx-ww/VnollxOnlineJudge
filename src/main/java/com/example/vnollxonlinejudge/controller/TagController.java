package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.model.dto.request.tag.CreateTagRequest;
import com.example.vnollxonlinejudge.model.dto.response.tag.TagResponse;
import com.example.vnollxonlinejudge.service.TagService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.management.relation.RelationSupport;
import java.util.List;

@RestController
@RequestMapping("/tag")
public class TagController {
    @Autowired
    private TagService tagService;
    @GetMapping("/list")
    public Result<List<TagResponse>> getTagList(){
        return Result.Success(tagService.getTagList(),"获取标签列表成功");
    }
}
