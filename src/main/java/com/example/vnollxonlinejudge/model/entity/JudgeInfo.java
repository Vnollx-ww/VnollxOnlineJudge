package com.example.vnollxonlinejudge.model.entity;

import lombok.Data;

@Data
public class JudgeInfo {
    private String code;
    private String language;
    private Long time;
    private Long memory;
    private Long cid;
    private Long uid;
    private Long pid;
    private String uname;

    private String createTime;
    public JudgeInfo(String code,String language,Long time,Long memory,Long cid,Long uid,Long pid,String createTime,String uname){
        this.code=code;
        this.language=language;
        this.time=time;
        this.memory=memory;
        this.cid=cid;
        this.uid=uid;
        this.pid=pid;
        this.createTime=createTime;
        this.uname=uname;
    }
}
