package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.dto.tag.CreateTagDTO;
import com.example.vnollxonlinejudge.service.TagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/tag")
@RequiredArgsConstructor
public class AdminTagController {
    private final TagService tagService;
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
