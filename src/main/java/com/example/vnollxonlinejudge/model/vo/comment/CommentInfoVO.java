package com.example.vnollxonlinejudge.model.vo.comment;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.example.vnollxonlinejudge.model.entity.Comment;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CommentInfoVO {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String content;
    private String username;
    private String createTime;
    private Long userId;
    private Long parentId;
    private String parentUsername; // 父评论的用户名
    List<CommentInfoVO> SubcommentList;
    public CommentInfoVO(){}
    public CommentInfoVO(Comment comment){
        this.setId(comment.getId());
        this.setContent(comment.getContent());
        this.setUsername(comment.getUsername());
        this.setCreateTime(comment.getCreateTime());
        this.setUserId(comment.getUserId());
        this.setParentId(comment.getParentId());
        this.setSubcommentList(new ArrayList<>()); // 初始化空列表
    }
}
