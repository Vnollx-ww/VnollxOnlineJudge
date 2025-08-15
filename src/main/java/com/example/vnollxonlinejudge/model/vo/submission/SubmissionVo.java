package com.example.vnollxonlinejudge.model.vo.submission;

import com.example.vnollxonlinejudge.model.entity.Submission;
import lombok.Data;

@Data
public class SubmissionVo {
    private Long id;
    private Long cid;
    private String userName;
    private String problemName;
    private String status;
    private String code;
    private String createTime;
    private String language;
    private Long time;
    private Long memory;
    private Long uid;
    private Long pid;
    public SubmissionVo(){
    }
    public SubmissionVo(Submission submission){
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
