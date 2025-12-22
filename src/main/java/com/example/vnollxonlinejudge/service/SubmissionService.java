package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.JudgeInfo;
import com.example.vnollxonlinejudge.model.query.SubmissionQuery;
import com.example.vnollxonlinejudge.model.vo.submission.SubmissionVo;
import com.example.vnollxonlinejudge.model.entity.Submission;

import java.util.List;

public interface SubmissionService {

    SubmissionVo getSubmissionById(Long id);
    void addSubmission(Submission submission);
    void processSubmission(JudgeInfo judgeInfo,String result);
    void deleteSubmissionsByPid(Long pid);
    List<SubmissionVo> getSubmissionList(SubmissionQuery submissionQuery);
    Long getCount(SubmissionQuery submissionQuery);
    void deleteSubmissionsByCid(Long cid);
    void updateSubmissionJudgeStatusBySnowflake(Long snowflakeId,String judgeStatus,Long time,Long memory);
}
