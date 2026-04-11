package com.example.vnollxonlinejudge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface UserSolvedProblemMapper extends BaseMapper<UserSolvedProblem> {

    /** 某题目（非比赛）通过人数（去重用户数） */
    @Select("SELECT COUNT(DISTINCT user_id) FROM user_solved_problem WHERE problem_id = #{problemId} AND competition_id = 0")
    Long countDistinctUsersByProblemId(@Param("problemId") Long problemId);

    /**
     * 限定用户集合内，某题目（非比赛）通过人数（去重）；userIds 为空时视为无人通过（返回 0）
     */
    @Select("<script>SELECT COUNT(DISTINCT user_id) FROM user_solved_problem WHERE problem_id = #{problemId} AND competition_id = 0 "
            + "<if test='userIds != null and userIds.size() &gt; 0'> AND user_id IN "
            + "<foreach collection='userIds' item='id' open='(' separator=',' close=')'>#{id}</foreach></if>"
            + "<if test='userIds == null or userIds.size() == 0'> AND 1 = 0 </if>"
            + "</script>")
    Long countDistinctUsersByProblemIdFiltered(@Param("problemId") Long problemId, @Param("userIds") List<Long> userIds);
}
