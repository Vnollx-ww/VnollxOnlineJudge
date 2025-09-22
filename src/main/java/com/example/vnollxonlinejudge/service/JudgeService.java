package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.judge.SubmitCodeDTO;
import com.example.vnollxonlinejudge.model.dto.judge.TestCodeDTO;

public interface JudgeService {

    String judgeSubmission(SubmitCodeDTO req,Long uid);
    String testSubmission(TestCodeDTO req);
}
