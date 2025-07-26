package com.example.vnollxonlinejudge.strategy.judge;

import com.example.vnollxonlinejudge.common.result.RunResult;

public interface JudgeStrategy {
    RunResult judge(String code, String dataZipUrl, int timeLimit, int memoryLimit);
}