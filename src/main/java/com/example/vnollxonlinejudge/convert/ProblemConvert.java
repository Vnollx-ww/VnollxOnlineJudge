package com.example.vnollxonlinejudge.convert;

import com.example.vnollxonlinejudge.model.entity.Problem;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ProblemConvert {
    ProblemConvert INSTANCE = Mappers.getMapper(ProblemConvert.class);

    @Mapping(target = "tags", ignore = true) // Tags usually need to be loaded separately
    ProblemVo toVo(Problem problem);

    List<ProblemVo> toVoList(List<Problem> list);
}
