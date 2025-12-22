package com.example.vnollxonlinejudge.model.vo.practice;

import com.example.vnollxonlinejudge.model.entity.Practice;
import lombok.Data;

@Data
public class PracticeVo {
    private Long id;
    private String title;
    private String description;
    private String createTime;
    private Boolean isPublic;
    private Integer problemCount;
    private Integer solvedCount;
    
    public PracticeVo() {}
    
    public PracticeVo(Practice practice) {
        this.id = practice.getId();
        this.title = practice.getTitle();
        this.description = practice.getDescription();
        this.createTime = practice.getCreateTime();
        this.isPublic = practice.getIsPublic();
        this.problemCount = 0;
        this.solvedCount = 0;
    }
    
    public PracticeVo(Practice practice, Integer problemCount, Integer solvedCount) {
        this.id = practice.getId();
        this.title = practice.getTitle();
        this.description = practice.getDescription();
        this.createTime = practice.getCreateTime();
        this.isPublic = practice.getIsPublic();
        this.problemCount = problemCount;
        this.solvedCount = solvedCount;
    }
}
