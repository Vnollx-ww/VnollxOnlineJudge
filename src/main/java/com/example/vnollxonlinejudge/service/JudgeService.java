package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.utils.Result;
import com.example.vnollxonlinejudge.utils.RunResult;

public interface JudgeService {
    RunResult judge(Problem problem, String code, String language);
}
