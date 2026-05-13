package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.judge.AgentSampleRequest;
import com.example.vnollxonlinejudge.judge.JudgeAgentClient;
import com.example.vnollxonlinejudge.judge.JudgeStatusDescriber;
import com.example.vnollxonlinejudge.model.base.RoleCode;
import com.example.vnollxonlinejudge.model.dto.judge.SubmitCodeDTO;
import com.example.vnollxonlinejudge.model.dto.judge.TestCodeDTO;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.entity.JudgeInfo;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.model.result.RunResult;
import com.example.vnollxonlinejudge.model.vo.judge.JudgeResultVO;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.CompetitionTeamService;
import com.example.vnollxonlinejudge.service.CompetitionUserService;
import com.example.vnollxonlinejudge.producer.JudgeProducer;
import com.example.vnollxonlinejudge.service.JudgeService;
import com.example.vnollxonlinejudge.service.SubmissionService;
import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.utils.SnowflakeIdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
public class JudgeServiceImpl implements JudgeService {
    private static final Logger logger = LoggerFactory.getLogger(JudgeServiceImpl.class);
    private final JudgeProducer judgeProducer;
    private final JudgeAgentClient judgeAgentClient;
    private final SubmissionService submissionService;
    private final CompetitionUserService competitionUserService;
    private final CompetitionService competitionService;
    private final CompetitionTeamService competitionTeamService;
    private final UserService userService;
    private static final ZoneId BEIJING_ZONE = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter SUBMISSION_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final SnowflakeIdGenerator gen =
            new SnowflakeIdGenerator(SnowflakeIdGenerator.defaultMachineId());
    @Autowired
    public JudgeServiceImpl(
            JudgeProducer judgeProducer,
            JudgeAgentClient judgeAgentClient,
            SubmissionService submissionService,
            CompetitionUserService competitionUserService,
            CompetitionService competitionService,
            CompetitionTeamService competitionTeamService,
            UserService userService
    ) {
        this.judgeProducer=judgeProducer;
        this.judgeAgentClient=judgeAgentClient;
        this.submissionService=submissionService;
        this.competitionUserService=competitionUserService;
        this.competitionService=competitionService;
        this.competitionTeamService=competitionTeamService;
        this.userService=userService;
    }
    @Override
    public JudgeResultVO judgeSubmission(SubmitCodeDTO req, Long uid) {
        Long cid = parseLong(req.getCid());
        String createTime = LocalDateTime.now(BEIJING_ZONE).format(SUBMISSION_TIME_FORMATTER);
        if (cid != null && cid > 0) {
            competitionService.judgeIsOpenById(createTime, cid);
            if (competitionUserService.hasFinishedCompetition(cid, uid)) {
                throw new BusinessException("你已确认结束本场比赛，无法再次提交");
            }
        }
        Long teamId = resolveTeamId(cid, uid);
        Long snowflakeId = gen.nextId();
        JudgeInfo judgeInfo=JudgeInfo.builder()
                .code(req.getCode())
                .language(req.getOption())
                .time(Long.parseLong(req.getTime()))
                .memory(Long.parseLong(req.getMemory()))
                .cid(Long.parseLong(req.getCid()))
                .uid(uid)
                .teamId(teamId)
                .pid(Long.parseLong(req.getPid()))
                .createTime(createTime)
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
                .teamId(judgeInfo.getTeamId())
                .createTime(judgeInfo.getCreateTime())
                .userName(judgeInfo.getUname())
                .status("等待评测")
                .time(0L) // 初始时间
                .memory(0L) // 初始内存
                .snowflakeId(snowflakeId)
                .build();

        submissionService.addSubmission(submission);
        // addSubmission 已基于 DB 计算并写入 queueAhead，复用同一份快照保证响应/列表/详情三处口径一致
        Integer queueAhead = submission.getQueueAhead();
        try {
            int priority = 1;
            judgeProducer.sendJudge(priority, judgeInfo);
            logger.info("消息发送到MQ成功: snowflakeId={}, uid={}, pid={}, queueAhead={}",
                    snowflakeId, uid, req.getPid(), queueAhead);
        } catch (Exception e) {
            logger.error("发送提交记录消息到MQ失败： judgeInfo={}, error=", judgeInfo, e);
            // 可以在这里接入监控告警，让开发者知道MQ出了问题
        }
        JudgeResultVO vo = new JudgeResultVO();
        vo.setSnowflakeId(snowflakeId);
        vo.setStatus("等待评测");
        vo.setQueueAhead(queueAhead);
        vo.setDescription(buildWaitingDescription(queueAhead));
        return vo;
    }

    /** 根据队列前方等待数量生成等待评测的中文描述。 */
    private String buildWaitingDescription(Integer queueAhead) {
        if (queueAhead == null) {
            return JudgeStatusDescriber.describe("等待评测", "submit");
        }
        if (queueAhead <= 0) {
            return "等待评测：已加入评测队列，即将开始评测。";
        }
        return "等待评测：队列前方还有 " + queueAhead + " 位，请稍候…";
    }

    private Long parseLong(String value) {
        try {
            return value == null || value.isBlank() ? null : Long.parseLong(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Long resolveTeamId(Long cid, Long uid) {
        if (cid == null || cid <= 0) {
            return null;
        }
        if (!"TEAM".equalsIgnoreCase(competitionService.getCompetitionById(cid).getParticipantType())) {
            return null;
        }
        com.example.vnollxonlinejudge.model.entity.CompetitionTeam team = competitionTeamService.getTeamByMember(cid, uid);
        if (team != null) {
            return team.getId();
        }
        if (!isAdminOrSuperAdmin(uid)) {
            throw new BusinessException("团队赛需要管理员预先导入队伍后才能提交");
        }
        return null;
    }

    private boolean isAdminOrSuperAdmin(Long uid) {
        User user = userService.getUserEntityById(uid);
        if (user == null) {
            return false;
        }
        return RoleCode.ADMIN.equals(user.getIdentity()) || RoleCode.SUPER_ADMIN.equals(user.getIdentity());
    }

    @Override
    public JudgeResultVO testSubmission(TestCodeDTO req,Long uid) {
        boolean customTest = Boolean.TRUE.equals(req.getCustomTest());

        AgentSampleRequest sampleReq = new AgentSampleRequest();
        sampleReq.setLanguage(req.getOption());
        sampleReq.setCode(req.getCode());
        sampleReq.setInputExample(req.getInputExample());
        sampleReq.setOutputExample(customTest ? null : req.getOutputExample());
        sampleReq.setTimeLimit(Long.parseLong(req.getTime()));
        sampleReq.setMemoryLimit(Long.parseLong(req.getMemory()));
        RunResult result = judgeAgentClient.runSample(sampleReq);
        JudgeResultVO vo=new JudgeResultVO();
        if (customTest) {
            vo.setActualOutput(extractStdout(result));
        } else {
            vo.setStatus(result.getStatus());
            // 面向用户的中文描述，前端直接展示
            vo.setDescription(JudgeStatusDescriber.describe(result.getStatus(), "test"));
            // 结构化字段：失败用例的输入 / 期望输出 / 程序实际输出
            vo.setInput(result.getCaseInput());
            vo.setExpectedOutput(result.getCaseExpected());
            vo.setActualOutput(extractStdout(result));
            // errorInfo 仅承载非结构化诊断（编译错误日志、运行时 stderr 等）
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