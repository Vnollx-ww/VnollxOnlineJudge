package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.judge.SubmitCodeDTO;
import com.example.vnollxonlinejudge.model.dto.judge.TestCodeDTO;
import com.example.vnollxonlinejudge.model.vo.judge.JudgeResultVO;

public interface JudgeService {

    JudgeResultVO judgeSubmission(SubmitCodeDTO req,Long uid);
    JudgeResultVO testSubmission(TestCodeDTO req, Long uid);
}
