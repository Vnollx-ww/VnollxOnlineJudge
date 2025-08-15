package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;

public interface JudgeStrategy {
    RunResult judge(String code, String dataZipUrl, Long timeLimit, Long memoryLimit);
}