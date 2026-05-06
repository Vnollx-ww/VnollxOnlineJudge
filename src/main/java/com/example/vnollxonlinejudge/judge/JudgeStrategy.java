package com.example.vnollxonlinejudge.judge;

import com.example.vnollxonlinejudge.model.result.RunResult;

public interface JudgeStrategy {
    RunResult judge(String code, String dataZipUrl, Long timeLimit, Long memoryLimit);

    default RunResult judge(String code, String dataZipUrl, Long timeLimit, Long memoryLimit, String judgeMode, String checkerFile) {
        return judge(code, dataZipUrl, timeLimit, memoryLimit);
    }

    RunResult testJudge(String code,String inputExample,String outputExample,Long timeLimit,Long memoryLimit);
}