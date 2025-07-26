package com.example.vnollxonlinejudge.strategy.judge;


import com.example.vnollxonlinejudge.common.result.RunResult;
import com.example.vnollxonlinejudge.utils.JavaJudge;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

@Component
public class JavaJudgeStrategy implements JudgeStrategy {
    @Override
    public RunResult judge(String code, String dataZipUrl, int timeLimit, int memoryLimit) {
        // 调用原有的JavaJudge工具类
        return JavaJudge.Judge(code, dataZipUrl, timeLimit, memoryLimit);
    }
}