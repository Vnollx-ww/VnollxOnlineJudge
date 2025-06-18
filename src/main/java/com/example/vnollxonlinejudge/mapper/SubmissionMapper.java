package com.example.vnollxonlinejudge.mapper;

import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.domain.Submission;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface SubmissionMapper {
    @Insert("INSERT INTO submissions(user_name,problem_name,status,create_time,language,uid,pid,time,code,cid) VALUES(#{user_name},#{problem_name}, #{status},#{create_time},#{language},#{uid},#{pid},#{time},#{code},#{cid})")
    void addSubmission(String user_name,String problem_name,String code,String status,String create_time,String language,long uid,long pid,int time,long cid);

    @Select("SELECT * FROM submissions Where cid=0 ORDER BY id DESC LIMIT #{size} OFFSET #{offset} ")
    List<Submission> getSubmission(int offset, int size);

    @Select("SELECT * FROM submissions WHERE submissions.uid = #{uid} AND cid = 0 ORDER BY id DESC LIMIT #{size} OFFSET #{offset}")
    List<Submission> getSubmissionByUid(long uid, int offset, int size);
    @Select("SELECT * FROM submissions WHERE submissions.id = #{id}")
    Submission getSubmissionById(long id);

    @Select("SELECT COUNT(*) FROM submissions WHERE submissions.uid = #{uid} AND cid=0")
    int getSubmissionCount(long uid);
    @Select("SELECT COUNT(*) FROM submissions WHERE cid=#{cid}")
    int getSubmissionCountByCid(long cid);
    @Select("SELECT * FROM submissions WHERE submissions.cid = #{cid} ORDER BY id DESC LIMIT #{size} OFFSET #{offset}")
    List<Submission> getSubmissionByCid(long cid, int offset, int size);
    @Select("SELECT COUNT(*) FROM submissions WHERE cid=0")
    int getAllSubmissionCount();

    @Select("SELECT * FROM submissions " +
            "WHERE cid = 0 " +
            "AND (status = #{status} OR COALESCE(#{status}, '') = '') " +
            "AND (language = #{language} OR COALESCE(#{language}, '') = '') " +
            "ORDER BY id DESC " +
            "LIMIT #{size} OFFSET #{offset}")
    List<Submission> getSubmissionByStatusAndLanguage(String status, String language, int offset,int size);


    @Select("SELECT COUNT(*) FROM submissions " +
            "WHERE cid = 0 " +
            "AND (status = #{status} OR COALESCE(#{status}, '') = '') " +
            "AND (language = #{language} OR COALESCE(#{language}, '') = '') ")
    int getCountByStatusAndLanguage( String status,  String language);

    void batchInsert(List<Submission> submissions);
}

