package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.utils.Result;

public interface JudgeService {
    String judge(Problem problem, String code, String language);
}
