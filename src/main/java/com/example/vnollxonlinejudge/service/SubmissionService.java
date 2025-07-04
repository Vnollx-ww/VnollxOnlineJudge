package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.domain.Submission;
import com.example.vnollxonlinejudge.utils.Result;

import java.util.List;

public interface SubmissionService {
    Result createSubmission(String code,String user_name,String problem_name,String status,String create_time,String language,long uid,long pid,int time,long cid);
    Result getSubmission(int offset,int size);

    Result getSubmissionByUid(long uid,int offset,int size);

    Result getSubmissionById(long id);

    Result getSubmissionCount(long uid);
    Result getSubmissionCountByCid(long cid);
    Result getSubmissionByCid(long cid,int offset,int size);
    Result getAllSubmissionCount();
    Result getSubmissionByStatusAndLanguage(String status,String language,int offset,int size);
    Result getCountByStatusAndLanguage(String status,String language);
    String processSubmission(Submission submission);
    void batchInsert(List<Submission> submissions);
}
