package com.example.vnollxonlinejudge.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionProblemBriefVo;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionRanklistVo;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionTeamVo;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import com.example.vnollxonlinejudge.model.entity.*;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.*;
import com.example.vnollxonlinejudge.model.base.RoleCode;
import com.example.vnollxonlinejudge.service.*;
import com.example.vnollxonlinejudge.utils.TimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.redis.core.ZSetOperations;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CompetitionServiceImpl extends ServiceImpl<CompetitionMapper, Competition> implements CompetitionService {
    private static final Logger logger = LoggerFactory.getLogger(CompetitionService.class);
    private final CompetitionUserService competitionUserService;
    private final CompetitionProblemService competitionProblemService;
    private final ProblemService problemService;
    private final RedisService redisService;
    private final UserSolvedProblemService userSolvedProblemService;
    private final SubmissionService submissionService;
    private final SubmissionMapper submissionMapper;
    private final CompetitionTeamMapper competitionTeamMapper;
    private final CompetitionTeamMemberMapper competitionTeamMemberMapper;
    private final CompetitionTeamService competitionTeamService;
    private final UserService userService;

    @Autowired
    public CompetitionServiceImpl(
            @Lazy CompetitionUserService competitionUserService,
            CompetitionProblemService competitionProblemService,
            ProblemService problemService,
            RedisService redisService,
            UserSolvedProblemService userSolvedProblemService,
            SubmissionService submissionService,
            SubmissionMapper submissionMapper,
            CompetitionTeamMapper competitionTeamMapper,
            CompetitionTeamMemberMapper competitionTeamMemberMapper,
            @Lazy CompetitionTeamService competitionTeamService,
            UserService userService
    ) {
        this.competitionUserService=competitionUserService;
        this.competitionProblemService=competitionProblemService;
        this.problemService=problemService;
        this.redisService=redisService;
        this.userSolvedProblemService=userSolvedProblemService;
        this.submissionService=submissionService;
        this.submissionMapper=submissionMapper;
        this.competitionTeamMapper=competitionTeamMapper;
        this.competitionTeamMemberMapper=competitionTeamMemberMapper;
        this.competitionTeamService=competitionTeamService;
        this.userService=userService;
    }
    private static final String PROBLEM_PASS_KEY = "competition_problem_pass:%d:%d"; // cid:pid
    private static final String PROBLEM_SUBMIT_KEY = "competition_problem_submit:%d:%d"; // cid:pid
    private static final String USER_PASS_COUNT_KEY = "competition_user_pass:%d:%s"; // cid:uid
    private static final String USER_PENALTY_KEY = "competition_user_penalty:%d:%s"; // cid:uid
    private static final String TIME_OUT_KEY = "competition_time_out:%d"; // cid
    private static final String TIME_BEGIN_KEY="competition_time_begin:%d";
    private static final String RANKING_KEY = "competition_ranking:%d"; // cid
    private static final long COMPETITION_CACHE_EXTRA_SECONDS = 60 * 60L;
    @Override
    public CompetitionVo getCompetitionById(Long id) {
        Competition competition = this.baseMapper.selectById(id);
        if (competition == null) {
            throw new BusinessException("比赛不存在");
        }
        return new CompetitionVo(competition);
    }
    @Override
    public void createCompetition(String title, String description, String beginTime, String endTime, String password,boolean needPassword,String antiCheatMode,String participantType) {
        Competition competition = new Competition();
        competition.setTitle(title);
        competition.setDescription(description);
        competition.setBeginTime(beginTime);
        competition.setEndTime(endTime);
        competition.setPassword(password);
        competition.setNeedPassword(needPassword);;
        competition.setAntiCheatMode(normalizeAntiCheatMode(antiCheatMode));
        competition.setParticipantType(normalizeParticipantType(participantType));

        this.save(competition);
    }

    @Override
    public void updateCompetition(Long id, String title, String description, String beginTime, String endTime, String password, boolean needPassword,String antiCheatMode,String participantType) {
        Competition competition=this.getById(id);
        if (competition==null){
            throw new BusinessException("比赛不存在或已被删除");
        }
        competition.setTitle(title);
        competition.setDescription(description);
        competition.setBeginTime(beginTime);
        competition.setEndTime(endTime);
        competition.setPassword(password);
        competition.setNeedPassword(needPassword);
        competition.setAntiCheatMode(normalizeAntiCheatMode(antiCheatMode));
        competition.setParticipantType(normalizeParticipantType(participantType));
        this.updateById(competition);
    }

    private String normalizeAntiCheatMode(String mode) {
        return "STRICT".equalsIgnoreCase(mode) ? "STRICT" : "NORMAL";
    }

    private String normalizeParticipantType(String participantType) {
        return "TEAM".equalsIgnoreCase(participantType) ? "TEAM" : "INDIVIDUAL";
    }

    @Override
    public List<CompetitionVo> getCompetitionList(int pageNum, int pageSize, String keyword) {
        QueryWrapper<Competition> wrapper=new QueryWrapper<>();
        List<Competition> competitionList;
        if (StringUtils.isNotBlank(keyword)){
            wrapper.like("title",keyword);
            Page<Competition> page = new Page<>(pageNum, pageSize);
            competitionList=this.page(page, wrapper).getRecords();
        }
        else{
            if (pageNum==0){
                competitionList = this.list(wrapper);
                competitionList.forEach(competition -> competition.setPassword("*******"));
            }
            else{
                Page<Competition> page = new Page<>(pageNum, pageSize);
                competitionList=this.page(page, wrapper).getRecords();
            }
        }
        return competitionList.stream()
                .map(CompetitionVo::new)
                .collect(Collectors.toList());
    }

    @Override
    public Long getCount(String keyword) {
        QueryWrapper<Competition>wrapper=new QueryWrapper<>();
        wrapper.like("title",keyword);
        return this.count(wrapper);
    }

    @Override
    public void confirmPassword(Long id,String password) {
        Competition competition = this.getById(id);
        if (competition == null) {
            throw new BusinessException("比赛不存在");
        }
        if (!Objects.equals(competition.getPassword(), password)) {
            throw new BusinessException("密码错误");
        }
    }

    @Override
    public List<CompetitionProblemBriefVo> getProblemList(Long cid, Long userId) {
        validateCompetitionParticipation(cid, userId);
        String cacheKey = "competition:" + cid + ":problems";
        String problemsJson = redisService.getValueByKey(cacheKey);
        String timeOutKey = String.format(TIME_OUT_KEY, cid);
        Set<Long> solvedIds = userSolvedProblemService.getSolvedProblemIdsInCompetition(userId, cid);
        List<CompetitionProblem> ordered = competitionProblemService.getProblemList(cid);

        if (problemsJson != null && redisService.getTtl(cacheKey) > COMPETITION_CACHE_EXTRA_SECONDS) {
            TypeReference<Map<Long, CompetitionProblemBriefVo>> typeRef = new TypeReference<>() {};
            Map<Long, CompetitionProblemBriefVo> problemMap = JSON.parseObject(problemsJson, typeRef);
            List<CompetitionProblemBriefVo> problems = new ArrayList<>();
            for (CompetitionProblem cp : ordered) {
                CompetitionProblemBriefVo p = problemMap.get(cp.getProblemId());
                if (p == null) {
                    continue;
                }
                attachCompetitionProblemCountsAndSolved(cid, p, solvedIds);
                problems.add(p);
            }
            String updatedProblemsJson = JSON.toJSONString(copyBriefMapForCache(problems));
            String endTimeStr = redisService.getValueByKey(timeOutKey);
            Long ttlSeconds = TimeUtils.calculateTTL(endTimeStr);
            redisService.setKey(cacheKey, updatedProblemsJson, ttlSeconds + COMPETITION_CACHE_EXTRA_SECONDS);
            return problems;
        }

        List<CompetitionProblemBriefVo> problems = new ArrayList<>();
        QueryWrapper<Competition> wrapper = new QueryWrapper<>();
        wrapper.eq("id", cid).select("end_time,begin_time");
        Competition competition = this.baseMapper.selectOne(wrapper);
        String endTimeStr = competition.getEndTime();
        String beginTimeStr = competition.getBeginTime();
        Long ttlSeconds = TimeUtils.calculateTTL(endTimeStr);
        for (CompetitionProblem competitionProblem : ordered) {
            Problem titleRow = problemService.getProblemTitleRow(competitionProblem.getProblemId());
            if (titleRow == null) {
                throw new BusinessException("题目不存在或已被删除");
            }
            CompetitionProblemBriefVo vo = new CompetitionProblemBriefVo();
            vo.setId(titleRow.getId());
            vo.setTitle(titleRow.getTitle());
            String problemSubmitKey = String.format(PROBLEM_SUBMIT_KEY, cid, vo.getId());
            String problemPassKey = String.format(PROBLEM_PASS_KEY, cid, vo.getId());
            if (ttlSeconds < 0) {
                vo.setSubmitCount(competitionProblem.getSubmitCount());
                vo.setPassCount(competitionProblem.getPassCount());
            } else {
                if (!redisService.IsExists(problemSubmitKey)) {
                    redisService.setKey(problemSubmitKey, "0", ttlSeconds + COMPETITION_CACHE_EXTRA_SECONDS);
                    redisService.setKey(problemPassKey, "0", ttlSeconds + COMPETITION_CACHE_EXTRA_SECONDS);
                }
                String passStr = redisService.getValueByKey(problemPassKey);
                String submitStr = redisService.getValueByKey(problemSubmitKey);
                vo.setPassCount(passStr != null ? Integer.parseInt(passStr) : 0);
                vo.setSubmitCount(submitStr != null ? Integer.parseInt(submitStr) : 0);
            }
            vo.setIsSolved(solvedIds.contains(vo.getId()));
            problems.add(vo);
        }
        if (!problems.isEmpty() && ttlSeconds > 0) {
            String updatedProblemsJson = JSON.toJSONString(copyBriefMapForCache(problems));
            redisService.setKey(cacheKey, updatedProblemsJson, ttlSeconds + COMPETITION_CACHE_EXTRA_SECONDS);
            redisService.setKey(timeOutKey, endTimeStr, ttlSeconds + COMPETITION_CACHE_EXTRA_SECONDS);
            String timeBeginKey = String.format(TIME_BEGIN_KEY, cid);
            redisService.setKey(timeBeginKey, beginTimeStr, ttlSeconds);
        }
        return problems;
    }

    @Override
    public void checkParticipation(Long cid, Long userId) {
        validateCompetitionParticipation(cid, userId);
    }

    private void validateCompetitionParticipation(Long cid, Long userId) {
        Competition competition = this.baseMapper.selectById(cid);
        if (competition == null) {
            throw new BusinessException("比赛不存在");
        }
        if (!"TEAM".equalsIgnoreCase(competition.getParticipantType())) {
            return;
        }
        if (isAdminOrSuperAdmin(userId)) {
            return;
        }
        if (competitionTeamService.getTeamByMember(cid, userId) == null) {
            throw new BusinessException("无权参加该比赛");
        }
    }

    private boolean isAdminOrSuperAdmin(Long userId) {
        User user = userService.getUserEntityById(userId);
        if (user == null) {
            return false;
        }
        return RoleCode.ADMIN.equals(user.getIdentity()) || RoleCode.SUPER_ADMIN.equals(user.getIdentity());
    }

    private void attachCompetitionProblemCountsAndSolved(Long cid, CompetitionProblemBriefVo p, Set<Long> solvedIds) {
        String passKey = String.format(PROBLEM_PASS_KEY, cid, p.getId());
        String submitKey = String.format(PROBLEM_SUBMIT_KEY, cid, p.getId());
        String passCount = redisService.getValueByKey(passKey);
        String submitCount = redisService.getValueByKey(submitKey);
        p.setPassCount(passCount != null ? Integer.parseInt(passCount) : 0);
        p.setSubmitCount(submitCount != null ? Integer.parseInt(submitCount) : 0);
        p.setIsSolved(solvedIds.contains(p.getId()));
    }

    /** 写入 Redis 时不带 isSolved，避免不同用户串数据 */
    private Map<Long, CompetitionProblemBriefVo> copyBriefMapForCache(List<CompetitionProblemBriefVo> list) {
        Map<Long, CompetitionProblemBriefVo> m = new LinkedHashMap<>();
        for (CompetitionProblemBriefVo p : list) {
            CompetitionProblemBriefVo c = new CompetitionProblemBriefVo();
            c.setId(p.getId());
            c.setTitle(p.getTitle());
            c.setSubmitCount(p.getSubmitCount());
            c.setPassCount(p.getPassCount());
            m.put(c.getId(), c);
        }
        return m;
    }

    @Override
    public List<UserVo> getUserList(Long cid) {
            String rankingKey = String.format(RANKING_KEY, cid);
            List<User> users = new ArrayList<>();
        // 从Redis获取排名
            if (redisService.getTtl(rankingKey) > COMPETITION_CACHE_EXTRA_SECONDS) {
                Set<ZSetOperations.TypedTuple<String>> userTuples = redisService.getZset(rankingKey);
                userTuples.forEach(tuple -> {
                    User user = new User();
                    user.setName(tuple.getValue());
                    String userPassKey = String.format(USER_PASS_COUNT_KEY, cid, user.getName());
                    String userPenaltyKey = String.format(USER_PENALTY_KEY, cid, user.getName());

                    String passCountStr = redisService.getValueByKey(userPassKey);
                    String penaltyTimeStr = redisService.getValueByKey(userPenaltyKey);
                    
                    user.setPassCount(passCountStr != null ? Integer.parseInt(passCountStr) : 0);
                    user.setPenaltyTime(penaltyTimeStr != null ? Integer.parseInt(penaltyTimeStr) : 0);
                    users.add(user);
                });
            } else {
                // 从数据库获取用户列表
                QueryWrapper<CompetitionUser> wrapper = new QueryWrapper<>();
                wrapper.eq("competition_id",cid);
                List<CompetitionUser> competitionUsers = competitionUserService.getUserList(cid);
                for (CompetitionUser cu : competitionUsers) {
                    User user = new User();
                    user.setName(cu.getName());
                    user.setPassCount(cu.getPassCount());
                    user.setPenaltyTime(cu.getPenaltyTime());
                    users.add(user);
                }
            }

            return users.stream()
                    .map(UserVo::new)
                    .collect(Collectors.toList());
    }

    @Override
    public CompetitionRanklistVo getRanklist(Long cid) {
        Competition competition = this.baseMapper.selectById(cid);
        if (competition == null) {
            throw new BusinessException("比赛不存在");
        }

        List<ProblemVo> problemList = getRanklistProblemList(cid);
        boolean teamCompetition = "TEAM".equalsIgnoreCase(competition.getParticipantType());
        List<UserVo> userList = teamCompetition ? new ArrayList<>() : getUserList(cid).stream()
                .sorted((a, b) -> {
                    int passCompare = Integer.compare(
                            b.getPassCount() == null ? 0 : b.getPassCount(),
                            a.getPassCount() == null ? 0 : a.getPassCount()
                    );
                    if (passCompare != 0) {
                        return passCompare;
                    }
                    return Integer.compare(
                            a.getPenaltyTime() == null ? 0 : a.getPenaltyTime(),
                            b.getPenaltyTime() == null ? 0 : b.getPenaltyTime()
                    );
                })
                .collect(Collectors.toList());

        CompetitionRanklistVo ranklist = new CompetitionRanklistVo();
        Map<Long, Integer> problemOrderMap = new HashMap<>();
        for (int i = 0; i < problemList.size(); i++) {
            ProblemVo problem = problemList.get(i);
            CompetitionRanklistVo.ProblemRankVo problemRankVo = new CompetitionRanklistVo.ProblemRankVo();
            problemRankVo.setId(problem.getId());
            problemRankVo.setTitle(problem.getTitle());
            problemRankVo.setLabel(String.valueOf((char) ('A' + i)));
            problemRankVo.setPassCount(problem.getPassCount() == null ? 0 : problem.getPassCount());
            problemRankVo.setSubmitCount(problem.getSubmitCount() == null ? 0 : problem.getSubmitCount());
            ranklist.getProblems().add(problemRankVo);
            problemOrderMap.put(problem.getId(), i);
        }
        Map<Long, String> problemLabelMap = ranklist.getProblems().stream()
                .collect(Collectors.toMap(
                        CompetitionRanklistVo.ProblemRankVo::getId,
                        CompetitionRanklistVo.ProblemRankVo::getLabel
                ));

        Map<String, CompetitionRanklistVo.UserRankVo> userMap = new LinkedHashMap<>();
        if (teamCompetition) {
            QueryWrapper<CompetitionTeam> teamWrapper = new QueryWrapper<>();
            teamWrapper.eq("competition_id", cid).orderByAsc("id");
            Map<String, UserVo> leaderStatMap = new HashMap<>();
            for (UserVo user : getUserList(cid)) {
                leaderStatMap.put(user.getName(), user);
            }
            for (CompetitionTeam team : competitionTeamMapper.selectList(teamWrapper)) {
                User leader = userService.getUserByEmail(team.getEmail());
                CompetitionRanklistVo.UserRankVo userRankVo = createEmptyRankUser(team.getId(), team.getTeamName(), problemList);
                userRankVo.setType("TEAM");
                if (leader != null) {
                    UserVo leaderStat = leaderStatMap.get(leader.getName());
                    if (leaderStat != null) {
                        userRankVo.setPassCount(leaderStat.getPassCount() == null ? 0 : leaderStat.getPassCount());
                        userRankVo.setPenaltyTime(leaderStat.getPenaltyTime() == null ? 0 : leaderStat.getPenaltyTime());
                    }
                }
                QueryWrapper<CompetitionTeamMember> memberWrapper = new QueryWrapper<>();
                memberWrapper.eq("team_id", team.getId()).orderByAsc("id");
                for (CompetitionTeamMember member : competitionTeamMemberMapper.selectList(memberWrapper)) {
                    CompetitionTeamVo.MemberVo memberVo = new CompetitionTeamVo.MemberVo();
                    memberVo.setRealName(member.getRealName());
                    userRankVo.getMembers().add(memberVo);
                }
                userMap.put(getTeamRankKey(team.getId()), userRankVo);
            }
        } else {
            for (UserVo user : userList) {
                CompetitionRanklistVo.UserRankVo userRankVo = createEmptyRankUser(user.getId(), user.getName(), problemList);
                userRankVo.setPassCount(user.getPassCount() == null ? 0 : user.getPassCount());
                userRankVo.setPenaltyTime(user.getPenaltyTime() == null ? 0 : user.getPenaltyTime());
                userMap.put(user.getName(), userRankVo);
            }
        }

        Map<Long, String> firstAcceptedMap = new HashMap<>();

        if (!teamCompetition) {
            QueryWrapper<Submission> submissionWrapper = new QueryWrapper<>();
            submissionWrapper.eq("cid", cid).orderByAsc("create_time").orderByAsc("id");
            List<Submission> submissions = submissionMapper.selectList(submissionWrapper);
            for (Submission submission : submissions) {
                if (!problemOrderMap.containsKey(submission.getPid())) {
                    continue;
                }
                String rankKey = submission.getUserName();
                CompetitionRanklistVo.UserRankVo userRankVo = userMap.get(rankKey);
                if (userRankVo == null) {
                    userRankVo = createEmptyRankUser(submission.getUid(), submission.getUserName(), problemList);
                    userMap.put(rankKey, userRankVo);
                }
                if (userRankVo.getId() == null && submission.getUid() != null) {
                    userRankVo.setId(submission.getUid());
                }

                CompetitionRanklistVo.ProblemResultVo resultVo = userRankVo.getProblems().get(problemOrderMap.get(submission.getPid()));
                if (Boolean.TRUE.equals(resultVo.getSolved())) {
                    continue;
                }
                if ("答案正确".equals(submission.getStatus())) {
                    int solveMinutes = calculateSolveMinutes(competition.getBeginTime(), submission.getCreateTime());
                    resultVo.setSolved(true);
                    resultVo.setSolveMinutes(solveMinutes);
                    resultVo.setSolveTime(formatSolveTime(solveMinutes));
                    firstAcceptedMap.putIfAbsent(submission.getPid(), rankKey);
                } else if (isFinishedWrongSubmission(submission.getStatus())) {
                    resultVo.setWrongCount((resultVo.getWrongCount() == null ? 0 : resultVo.getWrongCount()) + 1);
                }
            }

            for (Map.Entry<Long, String> firstAccepted : firstAcceptedMap.entrySet()) {
                CompetitionRanklistVo.UserRankVo userRankVo = userMap.get(firstAccepted.getValue());
                if (userRankVo == null || !problemOrderMap.containsKey(firstAccepted.getKey())) {
                    continue;
                }
                CompetitionRanklistVo.ProblemResultVo resultVo = userRankVo.getProblems().get(problemOrderMap.get(firstAccepted.getKey()));
                resultVo.setFirstSolve(true);
            }

            for (CompetitionRanklistVo.UserRankVo userRankVo : userMap.values()) {
                int passCount = 0;
                int penaltyTime = 0;
                for (CompetitionRanklistVo.ProblemResultVo resultVo : userRankVo.getProblems()) {
                    if (Boolean.TRUE.equals(resultVo.getSolved())) {
                        passCount++;
                        penaltyTime += (resultVo.getSolveMinutes() == null ? 0 : resultVo.getSolveMinutes())
                                + (resultVo.getWrongCount() == null ? 0 : resultVo.getWrongCount()) * 20;
                    }
                }
                userRankVo.setPassCount(passCount);
                userRankVo.setPenaltyTime(penaltyTime);
            }
        }
        List<CompetitionRanklistVo.UserRankVo> rankUsers = new ArrayList<>(userMap.values());
        rankUsers.sort((a, b) -> {
            int passCompare = Integer.compare(
                    b.getPassCount() == null ? 0 : b.getPassCount(),
                    a.getPassCount() == null ? 0 : a.getPassCount()
            );
            if (passCompare != 0) {
                return passCompare;
            }
            return Integer.compare(
                    a.getPenaltyTime() == null ? 0 : a.getPenaltyTime(),
                    b.getPenaltyTime() == null ? 0 : b.getPenaltyTime()
            );
        });
        ranklist.setUsers(rankUsers);
        return ranklist;
    }

    @Override
    public List<CompetitionRanklistVo.SubmissionRankVo> getRanklistSubmissions(Long cid, Long userId) {
        Competition competition = this.baseMapper.selectById(cid);
        if (competition == null) {
            throw new BusinessException("比赛不存在");
        }
        List<ProblemVo> problemList = getRanklistProblemList(cid);
        Map<Long, String> problemLabelMap = new HashMap<>();
        for (int i = 0; i < problemList.size(); i++) {
            problemLabelMap.put(problemList.get(i).getId(), String.valueOf((char) ('A' + i)));
        }
        boolean teamCompetition = "TEAM".equalsIgnoreCase(competition.getParticipantType());
        QueryWrapper<Submission> submissionWrapper = new QueryWrapper<>();
        submissionWrapper.eq("cid", cid);
        if (teamCompetition) {
            submissionWrapper.eq("team_id", userId);
        } else {
            submissionWrapper.eq("uid", userId);
        }
        submissionWrapper.orderByAsc("create_time").orderByAsc("id");
        List<CompetitionRanklistVo.SubmissionRankVo> result = new ArrayList<>();
        for (Submission submission : submissionMapper.selectList(submissionWrapper)) {
            if (!problemLabelMap.containsKey(submission.getPid())) {
                continue;
            }
            CompetitionRanklistVo.SubmissionRankVo submissionRankVo = new CompetitionRanklistVo.SubmissionRankVo();
            submissionRankVo.setId(submission.getSnowflakeId() != null ? submission.getSnowflakeId() : submission.getId());
            submissionRankVo.setProblemId(submission.getPid());
            submissionRankVo.setProblemLabel(problemLabelMap.get(submission.getPid()));
            submissionRankVo.setStatus(submission.getStatus());
            submissionRankVo.setResult("答案正确".equals(submission.getStatus()) ? "AC" : "WA");
            submissionRankVo.setSubmitTime(submission.getCreateTime());
            int submitMinutes = calculateSolveMinutes(competition.getBeginTime(), submission.getCreateTime());
            submissionRankVo.setSubmitMinutes(submitMinutes);
            submissionRankVo.setDisplayTime(formatSolveTime(submitMinutes));
            result.add(submissionRankVo);
        }
        return result;
    }

    private CompetitionRanklistVo.UserRankVo createEmptyRankUser(Long id, String name, List<ProblemVo> problemList) {
        CompetitionRanklistVo.UserRankVo userRankVo = new CompetitionRanklistVo.UserRankVo();
        userRankVo.setId(id);
        userRankVo.setName(name);
        userRankVo.setPassCount(0);
        userRankVo.setPenaltyTime(0);
        for (ProblemVo problem : problemList) {
            CompetitionRanklistVo.ProblemResultVo resultVo = new CompetitionRanklistVo.ProblemResultVo();
            resultVo.setProblemId(problem.getId());
            userRankVo.getProblems().add(resultVo);
        }
        return userRankVo;
    }

    private String getTeamRankKey(Long teamId) {
        return "TEAM:" + teamId;
    }

    private boolean isFinishedWrongSubmission(String status) {
        return status != null
                && !"答案正确".equals(status)
                && !"等待评测".equals(status)
                && !"评测中".equals(status);
    }

    private List<ProblemVo> getRanklistProblemList(Long cid) {
        List<CompetitionProblem> competitionProblems = competitionProblemService.getProblemList(cid);
        List<ProblemVo> problemList = new ArrayList<>();
        for (CompetitionProblem competitionProblem : competitionProblems) {
            ProblemVo problem = problemService.getProblemInfo(competitionProblem.getProblemId(), 0L, null);
            String passKey = String.format(PROBLEM_PASS_KEY, cid, problem.getId());
            String submitKey = String.format(PROBLEM_SUBMIT_KEY, cid, problem.getId());
            String passCount = redisService.getValueByKey(passKey);
            String submitCount = redisService.getValueByKey(submitKey);
            problem.setPassCount(passCount != null ? Integer.parseInt(passCount) : competitionProblem.getPassCount());
            problem.setSubmitCount(submitCount != null ? Integer.parseInt(submitCount) : competitionProblem.getSubmitCount());
            if (problem.getPassCount() == null) {
                problem.setPassCount(0);
            }
            if (problem.getSubmitCount() == null) {
                problem.setSubmitCount(0);
            }
            problemList.add(problem);
        }
        return problemList;
    }

    private int calculateSolveMinutes(String beginTime, String submitTime) {
        if (beginTime == null || submitTime == null) {
            return 0;
        }
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        LocalDateTime begin = LocalDateTime.parse(beginTime, formatter);
        LocalDateTime submit = LocalDateTime.parse(submitTime, formatter);
        long seconds = java.time.Duration.between(begin, submit).getSeconds();
        return (int) Math.max(0, seconds / 60);
    }

    private String formatSolveTime(Integer minutes) {
        if (minutes == null) {
            return "";
        }
        return (minutes / 60) + ":" + String.format("%02d", minutes % 60);
    }

    @Override
    public void judgeIsOpenById(String now, Long id) {
        QueryWrapper<Competition> queryWrapper = new QueryWrapper<>();
        queryWrapper.select("begin_time,end_time")
                .eq("id", id);

        Competition competition = this.baseMapper.selectOne(queryWrapper);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        LocalDateTime nowDateTime = LocalDateTime.parse(now, formatter);
        LocalDateTime beginDateTime = LocalDateTime.parse(competition.getBeginTime(), formatter);
        LocalDateTime endDateTime = LocalDateTime.parse(competition.getEndTime(), formatter);
        if (nowDateTime.isBefore(beginDateTime)) {
            throw new BusinessException("比赛暂未开始，请遵守规则");
        }
        if (nowDateTime.isAfter(endDateTime)) {
            throw new BusinessException("比赛已结束，无法提交题目");
        }
    }

    @Override
    public void judgeIsEndById(String now,Long id) {
        QueryWrapper<Competition> queryWrapper = new QueryWrapper<>();
        queryWrapper.select("end_time")
                .eq("id", id);

        Competition competition = this.baseMapper.selectOne(queryWrapper);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        LocalDateTime nowDateTime = LocalDateTime.parse(now, formatter);
        LocalDateTime endDateTime = LocalDateTime.parse(competition.getEndTime(), formatter);
        if (nowDateTime.isAfter(endDateTime)) {
            throw new BusinessException("比赛已结束，无法提交题目");
        }
    }

    @Override
    @Transactional
    public void deleteCompetition(Long id) {
        competitionUserService.deleteCompetition(id);
        competitionProblemService.deleteCompetition(id);
        submissionService.deleteSubmissionsByCid(id);
        userSolvedProblemService.deleteCompetition(id);
        this.removeById(id);
    }

    @Override
    public void addNumber(Long id) {
        addNumber(id, 1);
    }

    @Override
    public void addNumber(Long id, int delta) {
        if (delta <= 0) {
            return;
        }
        LambdaUpdateWrapper<Competition> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.setSql("number = number + " + delta)
                .eq(Competition::getId, id);
        this.update(updateWrapper);
    }

    @Override
    public Long getCompetitionCount() {
        return this.count();
    }
}
