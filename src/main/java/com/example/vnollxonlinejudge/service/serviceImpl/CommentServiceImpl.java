package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.mapper.CommentMapper;
import com.example.vnollxonlinejudge.model.dto.comment.PublishCommentDTO;
import com.example.vnollxonlinejudge.model.entity.Comment;
import com.example.vnollxonlinejudge.model.entity.Notification;
import com.example.vnollxonlinejudge.model.vo.comment.CommentInfoVO;
import com.example.vnollxonlinejudge.producer.NotificationProducer;
import com.example.vnollxonlinejudge.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CommentServiceImpl extends ServiceImpl<CommentMapper, Comment> implements CommentService {
    private final NotificationProducer notificationProducer;
    @Override
    @Transactional
    public void publishComment(PublishCommentDTO dto,Long uid) {
        Comment comment=new Comment();
        comment.setContent(dto.getContent());
        comment.setCreateTime(dto.getCreateTime());
        comment.setUsername(dto.getUsername());
        comment.setParentId(dto.getParentId());
        comment.setProblemId(dto.getProblemId());
        comment.setUserId(uid);
        this.save(comment);
        if (dto.getReceiveUserId()==null||dto.getReceiveUserId()==0||Objects.equals(uid, dto.getReceiveUserId()))return ;
        Instant now = Instant.now();
        DateTimeFormatter formatter = DateTimeFormatter.ISO_INSTANT;
        String formatted = formatter.format(now);
        String description = String.format("%s 在问题 #%s 中回复了你：%s",
                dto.getUsername(),
                dto.getProblemId(),
                dto.getContent()
        );
        Notification notification=new Notification("回复通知",description,formatted,dto.getReceiveUserId());
        QueryWrapper<Comment> wrapper=new QueryWrapper<>();
        wrapper.eq("create_time",dto.getCreateTime());
        Comment newComment=this.getOne(wrapper);
        notification.setCommentId(newComment.getId());
        notificationProducer.sendNotification(notification);
    }

    @Override
    public void deleteComment(Long id) {
        this.baseMapper.deleteById(id);
    }

    @Override
    public List<CommentInfoVO> getCommentList(Long pid) {
        // 查询该问题下的所有评论
        QueryWrapper<Comment> wrapper = new QueryWrapper<>();
        wrapper.eq("problem_id", pid);
        wrapper.orderByDesc("create_time");

        List<Comment> allComments = this.list(wrapper);

        if (CollectionUtils.isEmpty(allComments)) {
            return new ArrayList<>();
        }

        // 创建所有VO对象并建立映射关系
        Map<Long, CommentInfoVO> voMap = new HashMap<>();
        List<CommentInfoVO> result = new ArrayList<>();

        // 第一遍：创建所有VO对象
        for (Comment comment : allComments) {
            CommentInfoVO vo = new CommentInfoVO(comment);
            voMap.put(comment.getId(), vo);
        }

        // 第二遍：设置父评论用户名并构建分组结构
        for (Comment comment : allComments) {
            CommentInfoVO currentVO = voMap.get(comment.getId());
            
            // 如果有父评论，设置父评论用户名
            if (comment.getParentId() != null && comment.getParentId() != 0) {
                CommentInfoVO parentVO = voMap.get(comment.getParentId());
                if (parentVO != null) {
                    currentVO.setParentUsername(parentVO.getUsername());
                }
            }
            
            // 如果是顶级评论（没有父评论），直接添加到结果列表
            if (comment.getParentId() == null || comment.getParentId() == 0) {
                result.add(currentVO);
            } else {
                // 如果是子评论，找到对应的顶级评论，添加到其子评论列表中
                CommentInfoVO topLevelComment = findTopLevelComment(comment, voMap);
                if (topLevelComment != null) {
                    if (topLevelComment.getSubcommentList() == null) {
                        topLevelComment.setSubcommentList(new ArrayList<>());
                    }
                    topLevelComment.getSubcommentList().add(currentVO);
                }
            }
        }

        return result;
    }

    // 递归查找顶级评论
    private CommentInfoVO findTopLevelComment(Comment comment, Map<Long, CommentInfoVO> voMap) {
        if (comment.getParentId() == null || comment.getParentId() == 0) {
            return voMap.get(comment.getId());
        }
        
        // 递归查找顶级评论
        CommentInfoVO parentVO = voMap.get(comment.getParentId());
        if (parentVO != null) {
            // 如果父评论是顶级评论，直接返回
            if (parentVO.getParentId() == null || parentVO.getParentId() == 0) {
                return parentVO;
            } else {
                // 如果父评论也是子评论，继续向上查找
                return findTopLevelCommentById(comment.getParentId(), voMap);
            }
        }
        
        return null;
    }

    // 通过ID递归查找顶级评论
    private CommentInfoVO findTopLevelCommentById(Long commentId, Map<Long, CommentInfoVO> voMap) {
        CommentInfoVO commentVO = voMap.get(commentId);
        if (commentVO == null) {
            return null;
        }
        
        if (commentVO.getParentId() == null || commentVO.getParentId() == 0) {
            return commentVO;
        } else {
            return findTopLevelCommentById(commentVO.getParentId(), voMap);
        }
    }

}

