package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.consumer.SubmissionConsumer;
import com.example.vnollxonlinejudge.judge.JudgeStrategy;
import com.example.vnollxonlinejudge.judge.JudgeStrategyFactory;
import com.example.vnollxonlinejudge.model.entity.JudgeInfo;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.producer.SubmissionProducer;
import com.example.vnollxonlinejudge.service.JudgeService;
import com.example.vnollxonlinejudge.service.RedisService;

import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
@Setter
public class JudgeServiceImpl implements JudgeService {
    private static final Logger logger = LoggerFactory.getLogger(JudgeServiceImpl.class);
    @Autowired private SubmissionProducer submissionProducer;
    @Autowired private RedisService redisService;
    @Autowired private JudgeStrategyFactory judgeStrategyFactory;
    @Override
    public String judgeSubmit(String code, String option, Long pid, Long uid, Long cid, String create_time, String uname,Long time,Long memory) {
        String lockKey = "submission:" + "user:"+uid + "_" + pid;
        // 尝试获取锁（3秒内同一用户对同一题目提交无效）
        boolean locked = redisService.tryLock(lockKey,3000);

        if (!locked) {
           throw  new BusinessException("请勿重复提交（3秒内同一题目仅允许一次提交）");
        }
        JudgeInfo judgeInfo=new JudgeInfo(code,option,time,memory,cid,uid,pid,create_time,uname);
        JudgeStrategy strategy = judgeStrategyFactory.getStrategy(judgeInfo.getLanguage());
        RunResult result=strategy.judge(
                judgeInfo.getCode(),
                judgeInfo.getPid() + ".zip",
                judgeInfo.getTime(),
                judgeInfo.getMemory()
        );

        Submission submission = Submission.builder()
                .code(judgeInfo.getCode())
                .language(judgeInfo.getLanguage())
                .pid(judgeInfo.getPid())
                .cid(judgeInfo.getCid())
                .uid(judgeInfo.getUid())
                .createTime(judgeInfo.getCreateTime())
                .userName(judgeInfo.getUname())
                .status(result.getStatus())
                .time(result.getRunTime())
                .memory(result.getMemory())
                .build();

        try {
            int priority = 1;
            submissionProducer.sendSubmission(priority, submission);
        } catch (Exception e) {
            logger.error("发送提交记录消息到MQ失败： submission={}, error=", submission, e);
            // 可以在这里接入监控告警，让开发者知道MQ出了问题
        }
        return result.getStatus();
    }
}
