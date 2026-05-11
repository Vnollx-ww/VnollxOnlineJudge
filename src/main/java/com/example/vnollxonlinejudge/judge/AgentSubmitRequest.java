package com.example.vnollxonlinejudge.judge;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/**
 * 调 judge-agent /judge/submit 的请求体。
 * Agent 自行从本机 MinIO 读取题目数据 zip 和 checker 源码。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AgentSubmitRequest {
    private Long submissionId;
    private Long problemId;
    /** 题目数据版本号；每次管理员更新测试数据 zip 时递增，Agent 据此判断缓存是否过期。 */
    private String dataVersion;
    private String language;
    private String code;
    private Long timeLimit;
    private Long memoryLimit;
    private String judgeMode;
    private Double floatTolerance;
    private String checkerFile;
}
