package com.example.vnollxonlinejudge.convert;

import com.example.vnollxonlinejudge.model.entity.Solve;
import com.example.vnollxonlinejudge.model.vo.solve.SolveVo;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SolveConvert {
    SolveConvert INSTANCE = Mappers.getMapper(SolveConvert.class);

    SolveVo toVo(Solve solve);

    List<SolveVo> toVoList(List<Solve> list);
}
