package com.example.vnollxonlinejudge.convert;

import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.model.vo.submission.SubmissionVo;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SubmissionConvert {
    SubmissionConvert INSTANCE = Mappers.getMapper(SubmissionConvert.class);

    @Mapping(source = "id", target = "id")
    @Mapping(source = "cid", target = "cid")
    @Mapping(source = "userName", target = "userName")
    @Mapping(source = "problemName", target = "problemName")
    @Mapping(source = "status", target = "status")
    @Mapping(source = "code", target = "code")
    @Mapping(source = "createTime", target = "createTime")
    @Mapping(source = "language", target = "language")
    @Mapping(source = "time", target = "time")
    @Mapping(source = "memory", target = "memory")
    @Mapping(source = "uid", target = "uid")
    @Mapping(source = "pid", target = "pid")
    @Mapping(source = "errorInfo", target = "errorInfo")
    SubmissionVo toVo(Submission submission);

    List<SubmissionVo> toVoList(List<Submission> list);
}
