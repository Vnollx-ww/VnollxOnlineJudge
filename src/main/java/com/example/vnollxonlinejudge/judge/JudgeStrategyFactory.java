package com.example.vnollxonlinejudge.judge;


import com.example.vnollxonlinejudge.exception.BusinessException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class JudgeStrategyFactory {
    private final Map<String, JudgeStrategy> strategies;

    public JudgeStrategyFactory(List<JudgeStrategy> strategyList) {
        this.strategies = strategyList.stream()
                .collect(Collectors.toMap(
                        strategy -> strategy.getClass().getSimpleName()
                                .replace("JudgeStrategy", "")
                                .toLowerCase(),
                        Function.identity()
                ));
    }

    public JudgeStrategy getStrategy(String language) {
        JudgeStrategy strategy = strategies.get(language.toLowerCase());
        if (strategy == null) {
            throw new BusinessException("不支持的语言: " + language);
        }
        return strategy;
    }
}