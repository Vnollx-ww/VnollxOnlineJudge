package com.example.vnollxonlinejudge.model.dto.response.solve;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.example.vnollxonlinejudge.model.entity.Solve;
import jakarta.persistence.Column;
import lombok.Data;

@Data
public class SolveResponse {
    private Long  id;
    private String problemName;
    private String name;
    private String content;
    private long uid;

    private long pid;
    private String createTime;
    private String title;
    public SolveResponse(){

    }
    public SolveResponse(Solve solve){
        this.id=solve.getId();
        this.problemName=solve.getProblemName();
        this.name=solve.getName();
        this.content=solve.getContent();
        this.uid=solve.getUid();
        this.pid=solve.getPid();
        this.createTime=solve.getCreateTime();
        this.title=solve.getTitle();
    }
}
