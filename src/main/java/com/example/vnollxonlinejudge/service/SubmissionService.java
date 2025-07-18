package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.domain.Submission;
import com.example.vnollxonlinejudge.common.result.Result;
import java.util.List;

public interface SubmissionService {
    void createSubmission(String code,String user_name,String problem_name,String status,String create_time,String language,long uid,long pid,int time,long cid);
    List<Submission> getSubmission(int offset,int size);

    List<Submission> getSubmissionByUid(long uid,int offset,int size);

    Submission getSubmissionById(long id);

    int getSubmissionCount(long uid);
    int getSubmissionCountByCid(long cid);
    List<Submission> getSubmissionByCid(long cid,int offset,int size);
    int getAllSubmissionCount();
    List<Submission> getSubmissionByStatusAndLanguage(String status,String language,int offset,int size);
    int getCountByStatusAndLanguage(String status,String language);
    void processSubmission(Submission submission);
    void batchInsert(List<Submission> submissions);
}
