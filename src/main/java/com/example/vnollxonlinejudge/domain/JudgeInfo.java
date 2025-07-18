package com.example.vnollxonlinejudge.domain;

import lombok.Data;

@Data
public class JudgeInfo {
    private String code;
    private String language;
    private int time;
    private int memory;
    private long cid;
    private long uid;
    private long pid;
    private String uname;

    private String createTime;
    public JudgeInfo(String code,String language,int time,int memory,long cid,long uid,long pid,String createTime,String uname){
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
