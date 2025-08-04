package com.example.vnollxonlinejudge.model.dto.response.submission;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.example.vnollxonlinejudge.model.entity.Submission;
import jakarta.persistence.Column;
import lombok.Data;

@Data
public class SubmissionResponse {
    private Long id;
    private Long cid;
    private String userName;
    private String problemName;
    private String status;
    private String code;
    private String createTime;
    private String language;
    private int time;
    private int memory;
    private Long uid;
    private Long pid;
    public SubmissionResponse(){
    }
    public SubmissionResponse(Submission submission){
        this.id=submission.getId();
        this.cid=submission.getCid();
        this.userName=submission.getUserName();
        this.problemName=submission.getProblemName();
        this.status=submission.getStatus();
        this.code=submission.getCode();
        this.createTime=submission.getCreateTime();
        this.language=submission.getLanguage();
        this.time=submission.getTime();
        this.memory=submission.getMemory();
        this.uid=submission.getUid();
        this.pid=submission.getPid();
    }
}
