package com.example.vnollxonlinejudge.judge;


import com.example.vnollxonlinejudge.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class JudgeStrategyFactory {
    private final Map<String, JudgeStrategy> strategies;

    public JudgeStrategyFactory(List<JudgeStrategy> strategyList) {
        this.strategies = new HashMap<>(strategyList.stream()
                .collect(Collectors.toMap(
                        strategy -> strategy.getClass().getSimpleName()
                                .replace("JudgeStrategy", "")
                                .toLowerCase(),
                        Function.identity()
                )));
        registerAlias("golang", "go");
        registerAlias("go", "golang");
        registerAlias("javascript", "js");
        registerAlias("javascript", "node");
        registerAlias("javascript", "nodejs");
    }

    private void registerAlias(String target, String alias) {
        JudgeStrategy strategy = strategies.get(target);
        if (strategy != null) {
            strategies.put(alias, strategy);
        }
    }

    public JudgeStrategy getStrategy(String language) {
        JudgeStrategy strategy = strategies.get(language.toLowerCase());
        if (strategy == null) {
            throw new BusinessException("不支持的语言: " + language);
        }
        return strategy;
    }
}