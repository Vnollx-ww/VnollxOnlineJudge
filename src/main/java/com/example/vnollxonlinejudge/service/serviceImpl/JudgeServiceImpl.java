package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.consumer.SubmissionConsumer;
import com.example.vnollxonlinejudge.judge.JudgeStrategy;
import com.example.vnollxonlinejudge.judge.JudgeStrategyFactory;
import com.example.vnollxonlinejudge.model.dto.judge.SubmitCodeDTO;
import com.example.vnollxonlinejudge.model.dto.judge.TestCodeDTO;
import com.example.vnollxonlinejudge.model.entity.JudgeInfo;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.model.vo.judge.JudgeResultVO;
import com.example.vnollxonlinejudge.producer.SubmissionProducer;
import com.example.vnollxonlinejudge.service.JudgeService;
import com.example.vnollxonlinejudge.service.RedisService;

import com.example.vnollxonlinejudge.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
public class JudgeServiceImpl implements JudgeService {
    private static final Logger logger = LoggerFactory.getLogger(JudgeServiceImpl.class);
    private final SubmissionProducer submissionProducer;
    private final RedisService redisService;
    private final JudgeStrategyFactory judgeStrategyFactory;

    @Autowired
    public JudgeServiceImpl(
            SubmissionProducer submissionProducer,
            RedisService redisService,
            JudgeStrategyFactory judgeStrategyFactory
    ) {
        this.submissionProducer=submissionProducer;
        this.redisService=redisService;
        this.judgeStrategyFactory=judgeStrategyFactory;
    }
    @Override
    public JudgeResultVO judgeSubmission(SubmitCodeDTO req, Long uid) {
        tryLock(uid, Long.valueOf(req.getPid()));
        JudgeInfo judgeInfo=JudgeInfo.builder()
                .code(req.getCode())
                .language(req.getOption())
                .time(Long.parseLong(req.getTime()))
                .memory(Long.parseLong(req.getMemory()))
                .cid(Long.parseLong(req.getCid()))
                .uid(uid)
                .pid(Long.parseLong(req.getPid()))
                .createTime(req.getCreate_time())
                .uname(req.getUname())
                .build();

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
        JudgeResultVO vo=new JudgeResultVO();
        vo.setStatus(result.getStatus());
        vo.setErrorInfo(result.getFiles().getStderr());
        return vo;
    }

    @Override
    public JudgeResultVO testSubmission(TestCodeDTO req,Long uid) {

        tryLock(uid, Long.valueOf(req.getPid()));
        JudgeStrategy strategy = judgeStrategyFactory.getStrategy(req.getOption());

        RunResult result=strategy.testJudge(
                req.getCode(),
                req.getInputExample(),
                req.getOutputExample(),
                Long.parseLong(req.getTime()),
                Long.parseLong(req.getMemory())
        );
        JudgeResultVO vo=new JudgeResultVO();
        vo.setStatus(result.getStatus());
        vo.setErrorInfo(result.getFiles().getStderr());
        return vo;
    }

    public void tryLock(Long uid,Long pid){
        String lockKey = "submission:" + "user:"+uid + "_" + pid;
        // 尝试获取锁（3秒内同一用户对同一题目提交无效）
        boolean locked = redisService.tryLock(lockKey,3000);

        if (!locked) {
            throw  new BusinessException("请勿重复提交（3秒内同一题目仅允许一次提交）");
        }
    }
}
