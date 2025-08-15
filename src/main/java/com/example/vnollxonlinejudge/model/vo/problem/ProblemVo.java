package com.example.vnollxonlinejudge.model.vo.problem;

import com.example.vnollxonlinejudge.model.entity.Problem;
import lombok.Data;

import java.util.List;

@Data
public class ProblemVo {
    private Long id;
    private String title;
    private String description;
    private Integer timeLimit;
    private Integer memoryLimit;
    private String difficulty;
    private String inputExample;
    private String outputExample;
    private String hint;
    private String inputFormat;
    private String outputFormat;
    private Integer submitCount;
    private Integer passCount;
    private Boolean open;
    private List<String> tags;
    public ProblemVo(){}
    public ProblemVo(Problem problem) {
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
        this.submitCount = problem.getSubmitCount();
        this.passCount = problem.getPassCount();
        this.open=problem.getOpen();
    }
}
