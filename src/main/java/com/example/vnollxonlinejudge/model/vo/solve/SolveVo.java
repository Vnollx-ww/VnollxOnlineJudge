package com.example.vnollxonlinejudge.model.vo.solve;

import com.example.vnollxonlinejudge.model.entity.Solve;
import lombok.Data;

@Data
public class SolveVo {
    private Long  id;
    private String problemName;
    private String name;
    private String content;
    private Long uid;

    private Long pid;
    private String createTime;
    private String title;
    private Boolean status;
    public SolveVo(){}
    public SolveVo(Solve solve){
        this.id=solve.getId();
        this.problemName=solve.getProblemName();
        this.name=solve.getName();
        this.content=solve.getContent();
        this.uid=solve.getUid();
        this.pid=solve.getPid();
        this.createTime=solve.getCreateTime();
        this.title=solve.getTitle();
        this.status=solve.getStatus();
    }
}
