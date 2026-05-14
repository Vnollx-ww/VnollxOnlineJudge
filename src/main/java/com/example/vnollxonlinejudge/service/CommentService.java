package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.comment.PublishCommentDTO;
import com.example.vnollxonlinejudge.model.vo.comment.CommentInfoVO;

import java.util.List;


public interface CommentService {
    CommentInfoVO publishComment(PublishCommentDTO dto,Long uid);
    void deleteComment(Long id);
    List<CommentInfoVO> getCommentList(Long pid);
}
