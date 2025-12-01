package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.query.SubmissionQuery;
import com.example.vnollxonlinejudge.model.vo.submission.SubmissionVo;
import com.example.vnollxonlinejudge.model.entity.Submission;

import java.util.List;

public interface SubmissionService {

    SubmissionVo getSubmissionById(Long id);

    void processSubmission(Submission submission);
    void batchInsert(List<Submission> submissions);
    void deleteSubmissionsByPid(Long pid);
    List<SubmissionVo> getSubmissionList(SubmissionQuery submissionQuery);
    Long getCount(SubmissionQuery submissionQuery);
    void deleteSubmissionsByCid(Long cid);
}
