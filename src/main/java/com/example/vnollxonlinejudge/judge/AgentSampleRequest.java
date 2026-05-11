package com.example.vnollxonlinejudge.judge;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/**
 * 调 judge-agent /judge/run-sample 的请求体。
 * 用于样例运行和自定义输入运行；不依赖题目数据。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AgentSampleRequest {
    private String language;
    private String code;
    private String inputExample;
    private String outputExample;
    private Long timeLimit;
    private Long memoryLimit;
    private String judgeMode = "standard";
    private Double floatTolerance;
}
