package com.example.vnollxonlinejudge.convert;

import com.example.vnollxonlinejudge.model.dto.comment.PublishCommentDTO;
import com.example.vnollxonlinejudge.model.entity.Comment;
import com.example.vnollxonlinejudge.model.vo.comment.CommentInfoVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CommentConvert {
    CommentConvert INSTANCE = Mappers.getMapper(CommentConvert.class);

    @Mapping(target = "subcommentList", ignore = true)
    @Mapping(target = "parentUsername", ignore = true)
    CommentInfoVO toVo(Comment comment);

    @Mapping(source = "uid", target = "userId")
    Comment toEntity(PublishCommentDTO dto, Long uid);

    List<CommentInfoVO> toVoList(List<Comment> list);
}
