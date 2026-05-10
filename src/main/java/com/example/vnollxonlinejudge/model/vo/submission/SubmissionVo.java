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
    private String errorInfo;
    private Integer passCount;
    private Integer testCount;
    /**
     * 仅当 status="等待评测" 时由列表查询懒填充：
     * 当前提交在评测队列中前方还有多少条同样处于"等待评测"的提交。
     * 其他状态保持 null。
     */
    private Integer queueAhead;
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
        this.errorInfo=submission.getErrorInfo();
        this.passCount=submission.getPassCount();
        this.testCount=submission.getTestCount();
        this.queueAhead=submission.getQueueAhead();
        if (submission.getCid() != null && submission.getCid() != 0) {
            this.errorInfo = null;
            this.passCount = null;
            this.testCount = null;
        }
    }
}
