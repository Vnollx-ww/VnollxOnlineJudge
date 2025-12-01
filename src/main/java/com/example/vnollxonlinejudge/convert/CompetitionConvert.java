package com.example.vnollxonlinejudge.convert;

import com.example.vnollxonlinejudge.model.entity.Competition;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionVo;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CompetitionConvert {
    CompetitionConvert INSTANCE = Mappers.getMapper(CompetitionConvert.class);

    CompetitionVo toVo(Competition competition);

    List<CompetitionVo> toVoList(List<Competition> list);
}
