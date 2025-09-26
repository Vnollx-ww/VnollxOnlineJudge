package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.dto.tag.CreateTagDTO;
import com.example.vnollxonlinejudge.service.TagService;
import jakarta.validation.Valid;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/tag")
public class AdminTagController {
    private final TagService tagService;
    
    @Autowired
    public AdminTagController(TagService tagService) {
        this.tagService = tagService;
    }
    @PostMapping("/create")
    public Result<Void> createTag(@RequestBody CreateTagDTO req){
        tagService.createTag(req.getName());
        return Result.Success("标签创建成功");
    }
    @DeleteMapping("/delete/{id}")
    public Result<Void> deleteTag(@Valid @PathVariable Long id){
        tagService.deleteTag(id);
        return Result.Success("删除标签成功");
    }
}
