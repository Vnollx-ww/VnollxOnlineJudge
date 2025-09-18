package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.mapper.CommentMapper;
import com.example.vnollxonlinejudge.model.dto.comment.PublishCommentDTO;
import com.example.vnollxonlinejudge.model.entity.Comment;
import com.example.vnollxonlinejudge.model.vo.comment.CommentInfoVO;
import com.example.vnollxonlinejudge.service.CommentService;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CommentServiceImpl extends ServiceImpl<CommentMapper, Comment> implements CommentService {
    @Override
    public void publishComment(PublishCommentDTO dto,Long uid) {
        Comment comment=new Comment();
        comment.setContent(dto.getContent());
        comment.setCreateTime(dto.getCreateTime());
        comment.setUsername(dto.getUsername());
        comment.setParentId(dto.getParentId());
        comment.setProblemId(dto.getProblemId());
        comment.setUserId(uid);
        this.save(comment);
    }

    @Override
    public void deleteComment(Long id) {
        this.baseMapper.deleteById(id);
    }

    @Override
    public List<CommentInfoVO> getCommentList(Long pid) {
        // 一次性查询该问题下的所有评论
        QueryWrapper<Comment> wrapper = new QueryWrapper<>();
        wrapper.eq("problem_id", pid);
        // 这里不需要在数据库层面排序，因为我们要构建树形结构后再排序

        List<Comment> allComments = this.list(wrapper);

        if (CollectionUtils.isEmpty(allComments)) {
            return new ArrayList<>();
        }

        // 构建评论树
        Map<Long, CommentInfoVO> voMap = new HashMap<>();
        List<CommentInfoVO> result = new ArrayList<>();

        // 创建所有VO对象
        for (Comment comment : allComments) {
            CommentInfoVO vo = new CommentInfoVO(comment);
            voMap.put(comment.getId(), vo);
        }

        // 构建树形结构
        for (Comment comment : allComments) {
            CommentInfoVO currentVO = voMap.get(comment.getId());

            if (comment.getParentId() == null || comment.getParentId() == 0) {
                result.add(currentVO);
            } else {
                CommentInfoVO parentVO = voMap.get(comment.getParentId());
                if (parentVO != null) {
                    if (parentVO.getSubcommentList() == null) {
                        parentVO.setSubcommentList(new ArrayList<>());
                    }
                    parentVO.getSubcommentList().add(currentVO);
                }
            }
        }

        // 对每一层按时间降序排序（新的在前）
        sortCommentTreeDesc(result);

        return result;
    }

    // 递归降序排序整个评论树
    private void sortCommentTreeDesc(List<CommentInfoVO> comments) {
        if (CollectionUtils.isEmpty(comments)) {
            return;
        }

        // 对当前层级的评论按创建时间降序排序（新的在前）
        comments.sort(Comparator.comparing(CommentInfoVO::getCreateTime).reversed());

        // 递归对每个评论的子评论进行降序排序
        for (CommentInfoVO comment : comments) {
            if (comment.getSubcommentList() != null && !comment.getSubcommentList().isEmpty()) {
                sortCommentTreeDesc(comment.getSubcommentList());
            }
        }
    }
}
