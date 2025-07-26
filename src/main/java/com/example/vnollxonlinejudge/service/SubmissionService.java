package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.response.submission.SubmissionResponse;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.common.result.Result;
import java.util.List;

public interface SubmissionService {

    SubmissionResponse getSubmissionById(long id);

    void processSubmission(Submission submission);
    void batchInsert(List<Submission> submissions);
    void deleteSubmissionsByPid(long pid);
    List<SubmissionResponse> getSubmissionList(long cid,long uid,String language,String status,int pageNum,int pageSize);
    long getCount(long cid,long uid,String language,String status);
}
