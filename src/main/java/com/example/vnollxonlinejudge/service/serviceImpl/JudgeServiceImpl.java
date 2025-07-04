package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.domain.Problem;
import com.example.vnollxonlinejudge.service.JudgeService;
import com.example.vnollxonlinejudge.utils.CplusplusJudge;
import com.example.vnollxonlinejudge.utils.JavaJudge;
import com.example.vnollxonlinejudge.utils.PythonJudge;
import com.example.vnollxonlinejudge.utils.RunResult;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service

public class JudgeServiceImpl implements JudgeService {
    @Override
    public RunResult judge(Problem problem, String code, String language) {
        RunResult rawResult=null;
        if(Objects.equals(language, "cpp17")){
            rawResult = CplusplusJudge.Judge(code, problem.getDatazip(),
                    problem.getTimeLimit(), problem.getMemoryLimit());
        }else if(Objects.equals(language, "java")){
            rawResult = JavaJudge.Judge(code, problem.getDatazip(),
                    problem.getTimeLimit(), problem.getMemoryLimit());
        }
        return rawResult;
    }
}
