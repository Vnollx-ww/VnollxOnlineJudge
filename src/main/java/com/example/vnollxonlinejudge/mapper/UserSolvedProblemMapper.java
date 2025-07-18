package com.example.vnollxonlinejudge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.vnollxonlinejudge.domain.UserSolvedProblem;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface UserSolvedProblemMapper extends BaseMapper<UserSolvedProblem> {

}
