package com.example.vnollxonlinejudge.model.vo.judge;

import lombok.Data;

@Data
public class JudgeResultVO {
    private String status;
    /** 面向用户的中文描述（由后端根据 status + 场景生成，前端直接展示即可） */
    private String description;
    /** 编译错误日志 / 运行时 stderr 等非结构化诊断信息 */
    private String errorInfo;
    /** 失败用例的输入（仅自测、且非自定义测试时填充） */
    private String input;
    /** 失败用例的期望输出（仅自测、且非自定义测试时填充） */
    private String expectedOutput;
    /** 程序实际输出 */
    private String actualOutput;
    private Integer passCount;
    private Integer testCount;
    private Long snowflakeId;
    /**
     * 提交入队时，评测队列中排在本次提交前面的任务数量。
     * 仅在正式提交 (judgeSubmission) 的响应中填充，前端可用于展示"队列前方还有 N 位"。
     */
    private Integer queueAhead;
}
