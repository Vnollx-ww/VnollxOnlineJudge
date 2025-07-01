package com.example.vnollxonlinejudge.mapper;

import com.example.vnollxonlinejudge.domain.Problem;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface ProblemMapper {
    @Insert("INSERT INTO problems(title,description,time_limit,memory_limit,difficulty,input_example,output_example,datazip,submit_count,pass_count) VALUES(#{title}, #{description},#{timelimit},#{memorylimit},#{difficulty},#{inputexample},#{outputexample},#{datazip},0,0)")
    void addProblem(String title,String description,int timelimit,int memorylimit,String difficulty,String inputexample,String outputexample,String datazip);

    @Delete("DELETE FROM problems WHERE id = #{id}")
    void deleteProblem(long id);
    @Select("SELECT * FROM problems WHERE id = #{id}")
    Problem getProblemById(long id);

    @Update("UPDATE problems " +
            "SET title = #{title}, " +
            "description = #{description}, " +
            "time_limit = #{timelimit}, " +
            "memory_limit = #{memorylimit}, " +
            "difficulty = #{difficulty}, " +
            "input_example = #{inputexample}, " +
            "output_example = #{outputexample}, " +
            "datazip = #{datazip} " + // 假设数据库字段为 data_zip_address（下划线）
            "WHERE id = #{id}") // 必须添加 WHERE 条件，否则会更新所有记录！
    void updateProblem(long id,String title, String description, int timelimit, int memorylimit, String difficulty, String inputexample, String outputexample, String datazip);


    @Select("SELECT * FROM problems Where open =1 LIMIT #{size} OFFSET #{offset}")
    List<Problem> getProblemList(int offset,int size);

    @Select("SELECT COUNT(*) FROM problems WHERE open = 1 ")
    int getProblemCount();
    @Select("SELECT * FROM problems WHERE open = 1 AND (id = #{pid} OR title LIKE CONCAT('%', #{name}, '%')) LIMIT #{size} OFFSET #{offset}")
    List<Problem> getProblemListByKeywords(String name, long pid, int offset, int size);

    @Select("SELECT COUNT(*) FROM problems WHERE open = 1 AND (id = #{pid} OR title LIKE CONCAT('%', #{name}, '%'))")
    int getCountByKeywords(String name, long pid);

    @Update("UPDATE problems " +
            "SET pass_count = pass_count + #{ok}, " +  // 用逗号分隔字段，参数用#{ok}
            "submit_count = submit_count + 1 " +    // 提交次数直接+1（假设每次提交都计数）
            "WHERE id = #{pid}")
    void updatePassCount(long pid,int ok);
    @Update("UPDATE problems " +
            "SET pass_count = pass_count + #{ok}, " +  // 用逗号分隔字段，参数用#{ok}
            "submit_count = submit_count + 1," +    // 提交次数直接+1（假设每次提交都计数）
            "version = version+1 "+
            "WHERE id = #{pid}  AND version = #{oldVersion}")
    int updatePassCountWithOptimisticLock(long pid,int ok,int oldVersion);
}
