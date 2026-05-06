package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.judge.JudgeStrategy;
import com.example.vnollxonlinejudge.judge.JudgeStrategyFactory;
import com.example.vnollxonlinejudge.model.dto.judge.SubmitCodeDTO;
import com.example.vnollxonlinejudge.model.dto.judge.TestCodeDTO;
import com.example.vnollxonlinejudge.model.entity.JudgeInfo;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.model.vo.judge.JudgeResultVO;
import com.example.vnollxonlinejudge.producer.JudgeProducer;
import com.example.vnollxonlinejudge.service.JudgeService;
import com.example.vnollxonlinejudge.service.SubmissionService;
import com.example.vnollxonlinejudge.utils.SnowflakeIdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
public class JudgeServiceImpl implements JudgeService {
    private static final Logger logger = LoggerFactory.getLogger(JudgeServiceImpl.class);
    private final JudgeProducer judgeProducer;
    private final JudgeStrategyFactory judgeStrategyFactory;
    private final SubmissionService submissionService;
    private static final SnowflakeIdGenerator gen =
            new SnowflakeIdGenerator(SnowflakeIdGenerator.defaultMachineId());
    @Autowired
    public JudgeServiceImpl(
            JudgeProducer judgeProducer,
            JudgeStrategyFactory judgeStrategyFactory,
            SubmissionService submissionService
    ) {
        this.judgeProducer=judgeProducer;
        this.judgeStrategyFactory=judgeStrategyFactory;
        this.submissionService=submissionService;
    }
    @Override
    public JudgeResultVO judgeSubmission(SubmitCodeDTO req, Long uid) {
        Long snowflakeId = gen.nextId();
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
                .snowflakeId(snowflakeId)
                .build();

        Submission submission = Submission.builder()
                .code(judgeInfo.getCode())
                .language(judgeInfo.getLanguage())
                .problemName(req.getTitle())
                .pid(judgeInfo.getPid())
                .cid(judgeInfo.getCid())
                .uid(judgeInfo.getUid())
                .createTime(judgeInfo.getCreateTime())
                .userName(judgeInfo.getUname())
                .status("等待评测")
                .time(0L) // 初始时间
                .memory(0L) // 初始内存
                .snowflakeId(snowflakeId)
                .build();

        submissionService.addSubmission(submission);
        try {
            int priority = 1;
            judgeProducer.sendJudge(priority, judgeInfo);
            logger.info("消息发送到MQ成功: snowflakeId={}, uid={}, pid={}", snowflakeId, uid, req.getPid());
        } catch (Exception e) {
            logger.error("发送提交记录消息到MQ失败： judgeInfo={}, error=", judgeInfo, e);
            // 可以在这里接入监控告警，让开发者知道MQ出了问题
        }
        JudgeResultVO vo = new JudgeResultVO();
        vo.setSnowflakeId(snowflakeId);
        return vo;
    }

    @Override
    public JudgeResultVO testSubmission(TestCodeDTO req,Long uid) {
        JudgeStrategy strategy = judgeStrategyFactory.getStrategy(req.getOption());
        boolean customTest = Boolean.TRUE.equals(req.getCustomTest());

        RunResult result=strategy.testJudge(
                req.getCode(),
                req.getInputExample(),
                req.getOutputExample(),
                Long.parseLong(req.getTime()),
                Long.parseLong(req.getMemory())
        );
        JudgeResultVO vo=new JudgeResultVO();
        if (customTest) {
            vo.setActualOutput(extractStdout(result));
        } else {
            vo.setStatus(result.getStatus());
            vo.setErrorInfo(extractStderr(result));
        }
        vo.setPassCount(result.getPassCount());
        vo.setTestCount(result.getTestCount());
        return vo;
    }

    private String extractStdout(RunResult result) {
        if (result == null || result.getFiles() == null || result.getFiles().getStdout() == null) {
            return "";
        }
        return result.getFiles().getStdout();
    }

    private String extractStderr(RunResult result) {
        if (result == null || result.getFiles() == null) {
            return null;
        }
        return result.getFiles().getStderr();
    }
}