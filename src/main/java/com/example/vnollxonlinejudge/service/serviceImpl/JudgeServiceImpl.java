package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.model.entity.JudgeInfo;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.producer.SubmissionProducer;
import com.example.vnollxonlinejudge.service.JudgeService;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.RedisService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.vnollxonlinejudge.common.result.Result;


@Service

public class JudgeServiceImpl implements JudgeService {
    @Autowired
    private SubmissionProducer submissionProducer;
    @Autowired
    private RedisService redisService;
    @Autowired
    private ProblemService problemService;
    @Override
    public String judgeSubmit(String code, String option, long pid, long uid, long cid, String create_time, String uname,int time,int memory) {
        String lockKey = "submission:" + "user:"+uid + "_" + pid;
        // 尝试获取锁（3秒内同一用户对同一题目提交无效）
        boolean locked = redisService.tryLock(lockKey,3000);

        if (!locked) {
           throw  new BusinessException("请勿重复提交（3秒内同一题目仅允许一次提交）");
        }
        JudgeInfo judgeInfo=new JudgeInfo(code,option,time,memory,cid,uid,pid,create_time,uname);
        //String messageInfo="rabbitmq!!!!!!";
        int priority=1;
        return submissionProducer.sendSubmission(priority,judgeInfo);
    }
}
