package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.convert.SubmissionConvert;
import com.example.vnollxonlinejudge.model.entity.CompetitionProblem;
import com.example.vnollxonlinejudge.model.entity.JudgeInfo;
import com.example.vnollxonlinejudge.model.query.SubmissionQuery;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.submission.SubmissionVo;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.SubmissionMapper;
import com.example.vnollxonlinejudge.service.*;
import com.example.vnollxonlinejudge.utils.*;
import com.example.vnollxonlinejudge.websocket.CompetitionFirstBloodWebSocketHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

import static com.example.vnollxonlinejudge.utils.GetScore.calculateScore;

@Service
public class SubmissionServiceImpl extends ServiceImpl<SubmissionMapper,Submission> implements SubmissionService {
    private static final Logger logger = LoggerFactory.getLogger(SubmissionService.class);
    private final ProblemService problemService;
    private final RedisService redisService;
    private final UserService userService;
    private final CompetitionUserService competitionUserService;
    private final CompetitionService competitionService;
    private final CompetitionTeamService competitionTeamService;
    private final SubmissionConvert submissionConvert;
    private final UserTagService userTagService;
    private final ProblemTagService problemTagService;
    private final CompetitionFirstBloodWebSocketHandler competitionFirstBloodWebSocketHandler;
    private final CompetitionProblemService competitionProblemService;

    @Autowired
    public SubmissionServiceImpl(
            @Lazy ProblemService problemService,
            @Lazy RedisService redisService,
            UserService userService,
            CompetitionUserService competitionUserService,
            @Lazy CompetitionService competitionService,
            CompetitionTeamService competitionTeamService,
            UserTagService userTagService,
            ProblemTagService problemTagService,
            SubmissionConvert submissionConvert,
            CompetitionFirstBloodWebSocketHandler competitionFirstBloodWebSocketHandler,
            CompetitionProblemService competitionProblemService
    ) {
        this.problemService = problemService;
        this.redisService=redisService;
        this.userService=userService;
        this.competitionUserService=competitionUserService;
        this.competitionService=competitionService;
        this.competitionTeamService=competitionTeamService;
        this.userTagService=userTagService;
        this.problemTagService=problemTagService;
        this.submissionConvert=submissionConvert;
        this.competitionFirstBloodWebSocketHandler=competitionFirstBloodWebSocketHandler;
        this.competitionProblemService=competitionProblemService;
    }

    private static final String USER_PASS_COUNT_KEY = "competition_user_pass:%d:%s"; // cid:uid
    private static final String USER_PENALTY_KEY = "competition_user_penalty:%d:%s"; // cid:uid
    private static final String PROBLEM_PASS_KEY = "competition_problem_pass:%d:%d"; // cid:pid
    private static final String PROBLEM_SUBMIT_KEY = "competition_problem_submit:%d:%d"; // cid:pid
    private static final String RANKING_KEY = "competition_ranking:%d"; // cid
    private static final String TIME_OUT_KEY = "competition_time_out:%d"; // cid
    private static final String TIME_BEGIN_KEY="competition_time_begin:%d";
    private static final long COMPETITION_CACHE_EXTRA_SECONDS = 60 * 60L;

    public SubmissionVo getSubmissionById(Long id){
            Submission submission = this.getById(id);
            if (submission == null) {
                throw  new BusinessException("提交记录不存在");
            }
            return new SubmissionVo(submission);
    }

    @Override
    public void addSubmission(Submission submission) {
        String option=submission.getLanguage();
        String language = switch (option) {
            case "java" -> "Java";
            case "python" -> "Python";
            case "golang" -> "Golang";
            case "javascript" -> "JavaScript";
            default -> "C++";
        };
        submission.setLanguage(language);
        // 入库前给"等待评测"提交打上前方排队数快照：
        // 当前所有 status='等待评测' 的行数（不含本条，因为本条还没插入），
        // 即本条入队后将位于第 (count+1) 位，前方有 count 位。
        if ("等待评测".equals(submission.getStatus()) && submission.getQueueAhead() == null) {
            long ahead = this.count(new QueryWrapper<Submission>().eq("status", "等待评测"));
            submission.setQueueAhead((int) ahead);
        }
        this.save(submission);
    }

    @Override
    public void processSubmission(JudgeInfo judgeinfo,String result) {
        //初始化所有键和信息！！！
        Long pid=judgeinfo.getPid();
        Long uid=judgeinfo.getUid();
        Long cid=judgeinfo.getCid();
        String userName=judgeinfo.getUname();
        String participantName=userName;
        String participantDisplayName=userName;
        String createTime=judgeinfo.getCreateTime();
        ProblemVo problem;
        String userPassKey = null,userPenaltyKey=null,rankingKey=null,problemPassKey=null,problemSubmitKey=null,timeOutKey=null,timeBeginKey=null;
        boolean rankCompetition = cid != 0;
        if (cid != 0) {
            if ("TEAM".equalsIgnoreCase(competitionService.getCompetitionById(cid).getParticipantType())) {
                Long teamId = judgeinfo.getTeamId();
                if (teamId == null) {
                    // 管理员/超管在团队赛中没有队伍，仅作为测试提交，不计入排名与统计
                    logger.info("团队赛提交缺少 teamId，跳过排名统计: snowflakeId={}, uid={}, cid={}",
                            judgeinfo.getSnowflakeId(), uid, cid);
                    rankCompetition = false;
                } else {
                    com.example.vnollxonlinejudge.model.vo.competition.CompetitionTeamVo teamVo = competitionTeamService.getTeamVoById(teamId);
                    if (teamVo == null) {
                        logger.warn("团队赛提交对应队伍不存在，跳过排名统计: snowflakeId={}, uid={}, cid={}, teamId={}",
                                judgeinfo.getSnowflakeId(), uid, cid, teamId);
                        rankCompetition = false;
                    } else {
                        participantDisplayName = teamVo.getTeamName();
                    }
                }
            }
            if (!rankCompetition) {
                // 不参与排名（管理员等），跳过缓存初始化与 competition_user 写入
                // 但仍需走下面的题目信息加载与个人统计逻辑（在 rankCompetition=false 时按非比赛分支处理）
            } else {
            timeOutKey=String.format(TIME_OUT_KEY,cid);
            timeBeginKey=String.format(TIME_BEGIN_KEY,cid);
            userPassKey = String.format(USER_PASS_COUNT_KEY, cid, participantName);
            userPenaltyKey = String.format(USER_PENALTY_KEY, cid, participantName);
            rankingKey = String.format(RANKING_KEY, cid);
            problemPassKey = String.format(PROBLEM_PASS_KEY, cid, pid);
            problemSubmitKey = String.format(PROBLEM_SUBMIT_KEY, cid, pid);
            String endTimeStr=redisService.getValueByKey(timeOutKey);
            Long ttlSeconds= TimeUtils.calculateTTL(endTimeStr);
            redisService.setKey(userPassKey,"0",ttlSeconds + COMPETITION_CACHE_EXTRA_SECONDS);
            redisService.setKey(userPenaltyKey,"0",ttlSeconds + COMPETITION_CACHE_EXTRA_SECONDS);
            redisService.addToSetByKey(rankingKey,calculateScore(0L,0L),participantName,ttlSeconds + COMPETITION_CACHE_EXTRA_SECONDS);
            // 每个提交者都需要在 competition_user 中存在一行，否则 5 分钟定时同步与比赛结束同步会因
            // UPDATE 找不到行而静默失败，导致除首提者外所有人的成绩无法落库。
            // createRecord 内部捕获 DuplicateKeyException，配合 (competition_id, user_id) 唯一索引，可幂等调用。
            competitionUserService.createRecord(cid,uid,userName);
            }

        }
        //初始化所有键和信息！！！
        //获取题目信息！！！！
        if (cid == 0) problem = problemService.getProblemInfo(pid,0L,null);
        else{
            String problemsJson = redisService.getValueByKey("competition:" + cid + ":problems");
            TypeReference<Map<Long, ProblemVo>> typeRef = new TypeReference<Map<Long, ProblemVo>>() {
            };
            Map<Long, ProblemVo> problemMap = JSON.parseObject(problemsJson, typeRef);
            problem = problemMap.get(pid);
            if (problem == null) {
                problem = problemService.getProblemInfo(pid,0L,null);
            }
        }
        //获取题目信息！！！！
        boolean ok=problemService.isSolved(pid,uid,cid);
        //提交后对题目提交数，用户提交数进行处理！！！！
        if (result.equals("答案正确")) { //如果问题通过
            if (!ok) { //是否首次通过：首次才更新 tag、solve 记录、榜单/罚时、一血
                List<String> tagList=problemTagService.getTagNames(problem.getId());
                userTagService.updateTagPassStatus(uid,tagList,1L);
                problemService.addUserSolveRecord(pid,uid,cid,problem.getTitle()); //对问题添加通过记录
                if (!rankCompetition) { //如果非比赛，或团队赛中管理员等无队伍的提交
                    userService.updateSubmitCount(uid,1);//用户通过数加一，用户自己不太可能同时提交多次，所以无需加锁
                    problemService.updatePassCount(pid,1);//题目通过数也加一
                } else {
                    String beginTimeStr=redisService.getValueByKey(timeBeginKey);
                    Long penalty= TimeUtils.calculateMin(beginTimeStr,createTime);
                    redisService.updateIfPass(userPassKey,userPenaltyKey,problemPassKey,problemSubmitKey,rankingKey,participantName,penalty);//如果是比赛那就需要更新缓存了
                    pushCompetitionFirstBloodIfNeeded(cid, pid, problem.getTitle(), participantDisplayName, judgeinfo.getSnowflakeId());
                }
            } else { //已经 AC 过，再次 AC：只累加 submit 计数，不动榜单分数和罚时
                if (!rankCompetition) {
                    userService.updateSubmitCount(uid,0);
                    problemService.updatePassCount(pid,0);
                } else {
                    redisService.incrementProblemSubmit(problemSubmitKey);
                }
            }
        } else {//未通过
            if (!ok){
                List<String> tagList=problemTagService.getTagNames(problem.getId());
                userTagService.updateTagPassStatus(uid,tagList,1L);
            }
            if (!rankCompetition) {
                userService.updateSubmitCount(uid,0);//如果非比赛，提交总数加1
                problemService.updatePassCount(pid,0);//问题提交数也加一
            } else if (!ok) {
                redisService.updateIfNoPass(userPenaltyKey,problemSubmitKey,userPassKey,rankingKey,participantName);//是比赛，而且之前也没通过，那就需要罚时了
            } else { //比赛中已 AC 后再 WA：只让题目提交数 +1，不再罚时、不动榜单
                redisService.incrementProblemSubmit(problemSubmitKey);
            }
        }
    }

    private void pushCompetitionFirstBloodIfNeeded(Long cid, Long pid, String problemTitle, String participantName, Long currentSnowflakeId) {
        QueryWrapper<Submission> wrapper = new QueryWrapper<>();
        wrapper.eq("cid", cid)
                .eq("pid", pid)
                .eq("status", "答案正确")
                .orderByAsc("snowflake_id")
                .orderByAsc("id")
                .last("LIMIT 1");
        Submission firstAccepted = this.baseMapper.selectOne(wrapper);
        if (firstAccepted != null && Objects.equals(firstAccepted.getSnowflakeId(), currentSnowflakeId)) {
            competitionFirstBloodWebSocketHandler.sendFirstBlood(cid, pid, getCompetitionProblemLabel(cid, pid), problemTitle, participantName);
        }
    }

    private String getCompetitionProblemLabel(Long cid, Long pid) {
        List<CompetitionProblem> problems = competitionProblemService.getProblemList(cid);
        for (int i = 0; i < problems.size(); i++) {
            if (Objects.equals(problems.get(i).getProblemId(), pid)) {
                return String.valueOf((char) ('A' + i));
            }
        }
        return "";
    }
    @Override
    public void deleteSubmissionsByPid(Long pid) {
        QueryWrapper<Submission>wrapper=new QueryWrapper<>();
        wrapper.eq("pid",pid);
        this.baseMapper.delete(wrapper);
    }

    @Override
    public List<SubmissionVo> getSubmissionList(SubmissionQuery submissionQuery) {
        QueryWrapper<Submission> wrapper = buildQueryWrapper(submissionQuery);

        wrapper.orderByDesc("snowflake_id").orderByDesc("id");
        Page<Submission> page = new Page<>(submissionQuery.getPageNum(), submissionQuery.getPageSize());
        Page<Submission> result = this.page(page, wrapper);

        List<Submission> records = result.getRecords();
        List<SubmissionVo> submissionVos = submissionConvert.toVoList(records);
        if (submissionQuery.getCid() != null && submissionQuery.getCid() != 0) {
            boolean teamCompetition = "TEAM".equalsIgnoreCase(
                    competitionService.getCompetitionById(submissionQuery.getCid()).getParticipantType()
            );
            if (teamCompetition) {
                Map<Long, String> teamNameCache = new HashMap<>();
                for (int i = 0; i < records.size(); i++) {
                    Long teamId = records.get(i).getTeamId();
                    if (teamId == null) continue;
                    String teamName = teamNameCache.computeIfAbsent(teamId, tid -> {
                        com.example.vnollxonlinejudge.model.vo.competition.CompetitionTeamVo teamVo = competitionTeamService.getTeamVoById(tid);
                        return teamVo != null ? teamVo.getTeamName() : null;
                    });
                    if (teamName != null) {
                        submissionVos.get(i).setUserName(teamName);
                    }
                }
            }
            Long currentUserId = UserContextHolder.getCurrentUserId();
            submissionVos.forEach(submissionVo -> {
                if (currentUserId == null || !currentUserId.equals(submissionVo.getUid())) {
                    submissionVo.setCode(null);
                }
            });
        }
        fillQueueAhead(records, submissionVos);
        return submissionVos;

    }

    /**
     * 列表查询时懒计算"等待评测"提交在队列中前方还有多少位，覆盖入库时落库的快照值。
     * snowflakeId 单调递增 + 队列同优先级 FIFO ⇒
     * 前方人数 = 当前所有 status='等待评测' 中 snowflakeId 比自己小的数量。
     * 仅当当前页存在等待评测的提交时才发起一次轻量查询拉全部 waiting 的 snowflakeId。
     */
    private void fillQueueAhead(List<Submission> records, List<SubmissionVo> vos) {
        if (records == null || records.isEmpty()) return;
        // 先把非"等待评测"行的 queueAhead 置空，避免 DB 中残留的入库快照误导前端
        for (SubmissionVo vo : vos) {
            if (!"等待评测".equals(vo.getStatus())) {
                vo.setQueueAhead(null);
            }
        }
        boolean hasWaiting = false;
        for (SubmissionVo vo : vos) {
            if ("等待评测".equals(vo.getStatus())) { hasWaiting = true; break; }
        }
        if (!hasWaiting) return;
        QueryWrapper<Submission> w = new QueryWrapper<>();
        w.select("snowflake_id").eq("status", "等待评测").orderByAsc("snowflake_id");
        List<Long> waitingIds = this.baseMapper.selectList(w).stream()
                .map(Submission::getSnowflakeId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        for (int i = 0; i < records.size(); i++) {
            Submission s = records.get(i);
            SubmissionVo vo = vos.get(i);
            if (!"等待评测".equals(vo.getStatus()) || s.getSnowflakeId() == null) continue;
            int idx = Collections.binarySearch(waitingIds, s.getSnowflakeId());
            // 找到则前方数量等于 idx；未找到（极小概率竞态：已被消费者拉走改为评测中）则取插入点
            int ahead = idx >= 0 ? idx : -idx - 1;
            vo.setQueueAhead(Math.max(0, ahead));
        }
    }

    @Override
    public Long getCount(SubmissionQuery submissionQuery) {
        QueryWrapper<Submission> wrapper = buildQueryWrapper(submissionQuery);
        return this.count(wrapper);
    }

    @Override
    public void deleteSubmissionsByCid(Long cid) {
        QueryWrapper<Submission> wrapper=new QueryWrapper<>();
        wrapper.eq("cid",cid);
        this.baseMapper.delete(wrapper);
    }

    @Override
    public void updateSubmissionJudgeStatusBySnowflake(Long snowflakeId, String judgeStatus, Long time, Long memory, String errorInfo, Integer passCount, Integer testCount) {
        QueryWrapper<Submission> wrapper=new QueryWrapper<>();
        wrapper.eq("snowflake_id",snowflakeId);
        Submission submission=this.baseMapper.selectOne(wrapper);
        submission.setStatus(judgeStatus);
        submission.setMemory(memory);
        submission.setTime(time);
        submission.setErrorInfo(errorInfo);
        submission.setPassCount(passCount);
        submission.setTestCount(testCount);
        this.updateById(submission);
    }


    private QueryWrapper<Submission> buildQueryWrapper(SubmissionQuery query) {
        QueryWrapper<Submission> wrapper = new QueryWrapper<>();

        if (query.getCid() != null ) {
            wrapper.eq("cid", query.getCid());
        }
        if (query.getUid() != null && query.getUid() != 0) {
            wrapper.eq("uid", query.getUid());
        }
        if (StringUtils.isNotBlank(query.getLanguage())) {
            wrapper.eq("language", query.getLanguage());
        }
        if (StringUtils.isNotBlank(query.getStatus())) {
            wrapper.eq("status", query.getStatus());
        }
        if (StringUtils.isNotBlank(query.getKeyword())) {
            String keyword = query.getKeyword();
            wrapper.and(w -> {
                if (keyword.matches("^-?\\d+$")) {
                    w.eq("pid", Long.parseLong(keyword)).or();
                }
                w.like("user_name", keyword)
                        .or()
                        .like("problem_name", keyword);
            });
        }
        return wrapper;
    }
}
