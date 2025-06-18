package com.example.vnollxonlinejudge.mapper;

import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.domain.User_Solved_Problems;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface User_Solver_ProblemsMapper {

    @Insert("INSERT INTO user_solved_problems (user_id, problem_id,competition_id) VALUES (#{uid}, #{pid},#{cid})")
    void createUserSolveProblem(long uid,long pid,long cid);

    @Select("SELECT * from user_solved_problems WHERE user_id =#{uid} And competition_id=0")
    List<User_Solved_Problems> getSolveProblem(long uid);

    @Select("SELECT * from user_solved_problems WHERE user_id =#{uid} And problem_id=#{pid} AND competition_id=#{cid}")
    User_Solved_Problems judgeUserIsPass(long pid,long uid,long cid);
}
