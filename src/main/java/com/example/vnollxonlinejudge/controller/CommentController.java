package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.dto.comment.PublishCommentDTO;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.comment.CommentInfoVO;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionVo;
import com.example.vnollxonlinejudge.service.CommentService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;

@RestController
@RequestMapping("/comment")
public class CommentController {
    private final CommentService commentService;
    
    @Autowired
    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }
    @PostMapping("/publish")
    public Result<Void> publishComment(@RequestBody PublishCommentDTO dto) {
        Long uid=UserContextHolder.getCurrentUserId();
        commentService.publishComment(dto,uid);
        return Result.Success("发布评论成功");
    }
    @GetMapping("/list")
    public Result<List<CommentInfoVO>> getCommentList(@RequestParam Long pid) {
        return Result.Success(commentService.getCommentList(pid));
    }
    @DeleteMapping("/delete")
    public Result<Void> deleteComment(@RequestParam Long commentId) {
        commentService.deleteComment(commentId);
        return Result.Success("删除评论成功");
    }
}
