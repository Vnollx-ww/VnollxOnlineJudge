package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.dto.comment.PublishCommentDTO;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.comment.CommentInfoVO;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionVo;
import com.example.vnollxonlinejudge.service.CommentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;

@RestController
@RequestMapping("/comment")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;
    private Long getCurrentUserId(HttpServletRequest request) {
        String userId = (String) request.getAttribute("uid");
        if (userId == null || userId.trim().isEmpty()) {
            throw new BusinessException("未获取到用户ID");
        }
        try {
            return Long.parseLong(userId);
        } catch (NumberFormatException e) {
            throw new BusinessException("用户ID格式错误");
        }
    }
    @PostMapping("/publish")
    public Result<Void> publishComment(@RequestBody PublishCommentDTO dto,HttpServletRequest request) {
        Long uid=getCurrentUserId(request);
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
