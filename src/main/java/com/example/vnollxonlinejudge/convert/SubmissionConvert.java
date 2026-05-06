package com.example.vnollxonlinejudge.convert;

import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.model.vo.submission.SubmissionVo;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
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
    @Mapping(source = "passCount", target = "passCount")
    @Mapping(source = "testCount", target = "testCount")
    SubmissionVo toVo(Submission submission);

    List<SubmissionVo> toVoList(List<Submission> list);

    /** 比赛提交不向选手暴露判题细节（与 {@link SubmissionVo#SubmissionVo(Submission)} 一致） */
    @AfterMapping
    default void stripCompetitionJudgeDetail(@MappingTarget SubmissionVo vo, Submission submission) {
        if (submission.getCid() != null && submission.getCid() != 0) {
            vo.setErrorInfo(null);
            vo.setPassCount(null);
            vo.setTestCount(null);
        }
    }
}
