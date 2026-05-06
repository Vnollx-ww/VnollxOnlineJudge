package com.example.vnollxonlinejudge.model.vo.problem;

import com.example.vnollxonlinejudge.model.entity.Problem;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ProblemVo {
    private Long id;
    private String title;
    private String description;
    private Integer timeLimit;
    private Integer memoryLimit;
    private String difficulty;
    /** @deprecated 请使用 examples，兼容旧前端 */
    private String inputExample;
    /** @deprecated 请使用 examples，兼容旧前端 */
    private String outputExample;
    /** 多组输入输出样例（来自 problem_example 表） */
    private List<ProblemExampleVo> examples;
    private String hint;
    private String inputFormat;
    private String outputFormat;
    /** standard / special，与 problem.judge_mode 一致 */
    private String judgeMode;
    /** 构造题 checker 在 OSS 上的文件名，可为空 */
    private String checkerFile;
    private Integer submitCount;
    private Integer passCount;
    private Boolean open;
    private List<String> tags;
    private Boolean isSolved;

    public ProblemVo() {
        this.examples = new ArrayList<>();
    }

    public ProblemVo(Problem problem) {
        this();
        this.id = problem.getId();
        this.title = problem.getTitle();
        this.description = problem.getDescription();
        this.timeLimit = problem.getTimeLimit();
        this.memoryLimit = problem.getMemoryLimit();
        this.difficulty = problem.getDifficulty();
        this.inputExample = problem.getInputExample();
        this.outputExample = problem.getOutputExample();
        this.hint = problem.getHint();
        this.inputFormat = problem.getInputFormat();
        this.outputFormat = problem.getOutputFormat();
        this.judgeMode = problem.getJudgeMode();
        this.checkerFile = problem.getCheckerFile();
        this.submitCount = problem.getSubmitCount();
        this.passCount = problem.getPassCount();
        this.open = problem.getOpen();
    }
}
