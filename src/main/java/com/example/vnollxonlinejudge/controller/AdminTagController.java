package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.model.dto.request.tag.CreateTagRequest;
import com.example.vnollxonlinejudge.service.TagService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/tag")
public class AdminTagController {
    @Autowired
    private TagService tagService;
    @PostMapping("/create")
    public Result<Void> createTag(@RequestBody CreateTagRequest req){
        tagService.createTag(req.getName());
        return Result.Success("标签创建成功");
    }
    @DeleteMapping("/delete/{id}")
    public Result<Void> deleteTag(@Valid @PathVariable long id){
        tagService.deleteTag(id);
        return Result.Success("删除标签成功");
    }
}
