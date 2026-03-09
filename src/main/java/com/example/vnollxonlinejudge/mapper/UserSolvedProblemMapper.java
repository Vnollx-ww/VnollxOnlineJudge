package com.example.vnollxonlinejudge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserSolvedProblemMapper extends BaseMapper<UserSolvedProblem> {

    /** 某题目（非比赛）通过人数（去重用户数） */
    @Select("SELECT COUNT(DISTINCT user_id) FROM user_solved_problem WHERE problem_id = #{problemId} AND competition_id = 0")
    Long countDistinctUsersByProblemId(@Param("problemId") Long problemId);
}
