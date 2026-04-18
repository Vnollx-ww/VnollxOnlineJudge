package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.vnollxonlinejudge.mapper.StudentClassMapper;
import com.example.vnollxonlinejudge.mapper.StudentClassRelationMapper;
import com.example.vnollxonlinejudge.mapper.SubmissionMapper;
import com.example.vnollxonlinejudge.mapper.UserMapper;
import com.example.vnollxonlinejudge.mapper.UserSolvedProblemMapper;
import com.example.vnollxonlinejudge.model.base.RoleCode;
import com.example.vnollxonlinejudge.model.entity.StudentClass;
import com.example.vnollxonlinejudge.model.entity.StudentClassRelation;
import com.example.vnollxonlinejudge.model.entity.Practice;
import com.example.vnollxonlinejudge.model.entity.PracticeProblem;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import com.example.vnollxonlinejudge.model.query.SubmissionQuery;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.statistics.DailySubmissionVO;
import com.example.vnollxonlinejudge.model.vo.statistics.ErrorPatternStatVO;
import com.example.vnollxonlinejudge.model.vo.statistics.LanguageStatVO;
import com.example.vnollxonlinejudge.model.vo.statistics.LearningAnalyticsVO;
import com.example.vnollxonlinejudge.model.vo.statistics.PlatformStatsVO;
import com.example.vnollxonlinejudge.model.vo.statistics.PracticeProgressItemVO;
import com.example.vnollxonlinejudge.model.vo.statistics.SolvedProblemItemVO;
import com.example.vnollxonlinejudge.model.vo.statistics.AiLearningContextVO;
import com.example.vnollxonlinejudge.model.vo.statistics.StudentClassBriefVO;
import com.example.vnollxonlinejudge.model.vo.statistics.TeachingProgressClassSliceVO;
import com.example.vnollxonlinejudge.model.vo.statistics.TeachingProgressVO;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.PracticeProblemService;
import com.example.vnollxonlinejudge.service.PracticeService;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.ProblemTagService;
import com.example.vnollxonlinejudge.service.StatisticsService;
import com.example.vnollxonlinejudge.service.SubmissionService;
import com.example.vnollxonlinejudge.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class StatisticsServiceImpl implements StatisticsService {

    private final SubmissionMapper submissionMapper;
    private final UserSolvedProblemMapper userSolvedProblemMapper;
    private final SubmissionService submissionService;
    private final UserService userService;
    private final ProblemService problemService;
    private final ProblemTagService problemTagService;
    private final CompetitionService competitionService;
    private final PracticeService practiceService;
    private final PracticeProblemService practiceProblemService;
    private final StudentClassRelationMapper studentClassRelationMapper;
    private final StudentClassMapper studentClassMapper;
    private final UserMapper userMapper;

    @Autowired
    public StatisticsServiceImpl(SubmissionMapper submissionMapper,
                                 UserSolvedProblemMapper userSolvedProblemMapper,
                                 SubmissionService submissionService,
                                 UserService userService,
                                 ProblemService problemService,
                                 ProblemTagService problemTagService,
                                 CompetitionService competitionService,
                                 PracticeService practiceService,
                                 PracticeProblemService practiceProblemService,
                                 StudentClassRelationMapper studentClassRelationMapper,
                                 StudentClassMapper studentClassMapper,
                                 UserMapper userMapper) {
        this.submissionMapper = submissionMapper;
        this.userSolvedProblemMapper = userSolvedProblemMapper;
        this.submissionService = submissionService;
        this.userService = userService;
        this.problemService = problemService;
        this.problemTagService = problemTagService;
        this.competitionService = competitionService;
        this.practiceService = practiceService;
        this.practiceProblemService = practiceProblemService;
        this.studentClassRelationMapper = studentClassRelationMapper;
        this.studentClassMapper = studentClassMapper;
        this.userMapper = userMapper;
    }

    @Override
    public List<ErrorPatternStatVO> getErrorPatternStats() {
        List<ErrorPatternStatVO> list = submissionMapper.countByStatus();
        return list != null ? list : new ArrayList<>();
    }

    @Override
    public PlatformStatsVO getPlatformStats(int days) {
        long problemCount = problemService.getCount(null, null, true);
        long userCount = userService.getCount();
        long submissionCount = submissionService.getCount(new SubmissionQuery());
        long competitionCount = competitionService.getCompetitionCount();

        String startDate = LocalDate.now().minusDays(Math.max(1, days)).format(DateTimeFormatter.ISO_LOCAL_DATE);
        List<DailySubmissionVO> dailySubmissions = submissionMapper.countByDate(startDate);
        if (dailySubmissions == null) {
            dailySubmissions = new ArrayList<>();
        }

        List<LanguageStatVO> languageDistribution = submissionMapper.countByLanguage();
        if (languageDistribution == null) {
            languageDistribution = new ArrayList<>();
        }

        return PlatformStatsVO.builder()
                .problemCount(problemCount)
                .userCount(userCount)
                .submissionCount(submissionCount)
                .competitionCount(competitionCount)
                .dailySubmissions(dailySubmissions)
                .languageDistribution(languageDistribution)
                .build();
    }

    @Override
    public LearningAnalyticsVO getLearningAnalytics(Long userId, int days, Long currentUserId, String currentIdentity) {
        if (userId == null) {
            throw new BusinessException("请指定用户或登录后查看");
        }
        User user = userService.getUserEntityById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        if (RoleCode.TEACHER.equals(currentIdentity) && !Objects.equals(userId, currentUserId)) {
            Set<Long> myStudentIds = listTeacherAllStudentIds(currentUserId);
            if (!myStudentIds.contains(userId)) {
                throw new BusinessException("该学生不在您的班级中，无权查看");
            }
        }
        long totalSolved = 0;
        long totalSubmit = user.getSubmitCount() != null ? user.getSubmitCount().longValue() : 0;
        List<UserSolvedProblem> solvedList = userService.getSolveProblem(userId);
        if (solvedList != null) {
            totalSolved = solvedList.size();
        }
        double passRate = totalSubmit > 0
                ? (100.0 * (user.getPassCount() != null ? user.getPassCount().longValue() : 0) / totalSubmit)
                : 0.0;

        String startDate = LocalDate.now().minusDays(Math.max(1, days)).format(DateTimeFormatter.ISO_LOCAL_DATE);
        List<DailySubmissionVO> dailySubmissions = submissionMapper.countByDateAndUser(startDate, userId);
        if (dailySubmissions == null) {
            dailySubmissions = new ArrayList<>();
        }

        List<SolvedProblemItemVO> solvedProblems = new ArrayList<>();
        if (solvedList != null && !solvedList.isEmpty()) {
            for (UserSolvedProblem usp : solvedList) {
                try {
                    ProblemVo pvo = problemService.getProblemInfo(usp.getProblemId(), 0L, null);
                    List<String> tags = problemTagService.getTagNames(usp.getProblemId());
                    solvedProblems.add(new SolvedProblemItemVO(
                            usp.getProblemId(),
                            pvo != null ? pvo.getTitle() : "",
                            pvo != null ? pvo.getDifficulty() : null,
                            tags != null ? tags : Collections.emptyList()
                    ));
                } catch (Exception ignored) {
                    solvedProblems.add(new SolvedProblemItemVO(usp.getProblemId(), "", null, Collections.emptyList()));
                }
            }
        }

        return LearningAnalyticsVO.builder()
                .userId(userId)
                .userName(user.getName())
                .totalSolved(totalSolved)
                .totalSubmit(totalSubmit)
                .passRate(Math.round(passRate * 10) / 10.0)
                .dailySubmissions(dailySubmissions)
                .solvedProblems(solvedProblems)
                .build();
    }

    @Override
    public List<TeachingProgressVO> getTeachingProgress(Long practiceId, String dimension, Long filterClassId,
                                                         Long currentUserId, String currentIdentity) {
        boolean isTeacher = RoleCode.TEACHER.equals(currentIdentity);
        String dim = normalizeTeachingDimension(dimension);
        if ("class".equals(dim) && (filterClassId == null || filterClassId <= 0)) {
            dim = "all";
        }

        Set<Long> teacherClassIds = isTeacher ? listTeacherClassIds(currentUserId) : null;

        if (isTeacher && "class".equals(dim) && filterClassId != null) {
            if (teacherClassIds == null || !teacherClassIds.contains(filterClassId)) {
                throw new BusinessException("无权查看该班级的数据");
            }
        }

        List<TeachingProgressVO> result = new ArrayList<>();
        List<com.example.vnollxonlinejudge.model.vo.practice.PracticeVo> practices;
        if (practiceId != null) {
            com.example.vnollxonlinejudge.model.vo.practice.PracticeVo one = practiceService.getPracticeById(practiceId, null);
            practices = one != null ? List.of(one) : Collections.emptyList();
        } else {
            practices = practiceService.getPracticeList(1, 500, null);
        }

        if (isTeacher) {
            practices = practices.stream()
                    .filter(p -> Objects.equals(p.getCreatorId(), currentUserId))
                    .toList();
        }

        for (com.example.vnollxonlinejudge.model.vo.practice.PracticeVo p : practices) {
            List<PracticeProblem> problemLinks = practiceProblemService.getProblemList(p.getId());
            String teacherName = resolvePracticeCreatorName(p.getCreatorId());

            if ("by_class".equals(dim)) {
                List<Long> visibleIds = p.getVisibleClassIds() != null ? p.getVisibleClassIds() : Collections.emptyList();
                if (isTeacher) {
                    visibleIds = visibleIds.stream()
                            .filter(cid -> teacherClassIds != null && teacherClassIds.contains(cid))
                            .toList();
                }
                Map<Long, String> classNameMap = loadClassNameMap(visibleIds);
                List<TeachingProgressClassSliceVO> slices = new ArrayList<>();
                for (Long cid : visibleIds) {
                    List<Long> studentIds = listStudentIdsByClassId(cid);
                    List<PracticeProgressItemVO> pl = buildPracticeProgressForUserScope(problemLinks, studentIds);
                    slices.add(TeachingProgressClassSliceVO.builder()
                            .classId(cid)
                            .className(classNameMap.getOrDefault(cid, ""))
                            .studentCount(studentIds.size())
                            .problemProgressList(pl)
                            .build());
                }
                result.add(TeachingProgressVO.builder()
                        .practiceId(p.getId())
                        .practiceTitle(p.getTitle())
                        .totalProblems(problemLinks.size())
                        .creatorId(p.getCreatorId())
                        .creatorName(teacherName)
                        .dimension("by_class")
                        .filterClassId(null)
                        .problemProgressList(null)
                        .classSlices(slices)
                        .build());
            } else if ("class".equals(dim)) {
                List<Long> studentIds = listStudentIdsByClassId(filterClassId);
                List<PracticeProgressItemVO> progressList = buildPracticeProgressForUserScope(problemLinks, studentIds);
                result.add(TeachingProgressVO.builder()
                        .practiceId(p.getId())
                        .practiceTitle(p.getTitle())
                        .totalProblems(problemLinks.size())
                        .creatorId(p.getCreatorId())
                        .creatorName(teacherName)
                        .dimension("class")
                        .filterClassId(filterClassId)
                        .problemProgressList(progressList)
                        .classSlices(null)
                        .build());
            } else {
                List<PracticeProgressItemVO> progressList;
                if (isTeacher) {
                    Set<Long> myStudentIds = listTeacherAllStudentIds(currentUserId);
                    progressList = buildPracticeProgressForUserScope(problemLinks, new ArrayList<>(myStudentIds));
                } else {
                    progressList = buildPracticeProgressGlobal(problemLinks);
                }
                result.add(TeachingProgressVO.builder()
                        .practiceId(p.getId())
                        .practiceTitle(p.getTitle())
                        .totalProblems(progressList.size())
                        .creatorId(p.getCreatorId())
                        .creatorName(teacherName)
                        .dimension("all")
                        .filterClassId(null)
                        .problemProgressList(progressList)
                        .classSlices(null)
                        .build());
            }
        }
        return result;
    }

    @Override
    public List<StudentClassBriefVO> listStudentClassesForStats(Long currentUserId, String currentIdentity) {
        QueryWrapper<StudentClass> wrapper = new QueryWrapper<>();
        if (RoleCode.TEACHER.equals(currentIdentity)) {
            wrapper.eq("teacher_id", currentUserId);
        }
        wrapper.orderByDesc("create_time");
        List<StudentClass> list = studentClassMapper.selectList(wrapper);
        if (list == null || list.isEmpty()) {
            return new ArrayList<>();
        }
        List<StudentClassBriefVO> out = new ArrayList<>(list.size());
        for (StudentClass c : list) {
            out.add(new StudentClassBriefVO(c.getId(), c.getClassName()));
        }
        return out;
    }

    @Override
    public List<Map<String, Object>> listAccessibleStudents(Long currentUserId, String currentIdentity) {
        if (RoleCode.TEACHER.equals(currentIdentity)) {
            Set<Long> studentIds = listTeacherAllStudentIds(currentUserId);
            if (studentIds.isEmpty()) {
                return new ArrayList<>();
            }
            QueryWrapper<User> wrapper = new QueryWrapper<>();
            wrapper.in("id", studentIds).orderByAsc("name");
            List<User> users = userMapper.selectList(wrapper);
            return users.stream().map(u -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", u.getId());
                m.put("name", u.getName());
                return m;
            }).toList();
        }
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("identity", RoleCode.USER).orderByAsc("name");
        List<User> users = userMapper.selectList(wrapper);
        return users.stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("name", u.getName());
            return m;
        }).toList();
    }

    private Set<Long> listTeacherClassIds(Long teacherId) {
        QueryWrapper<StudentClass> w = new QueryWrapper<>();
        w.eq("teacher_id", teacherId);
        List<StudentClass> classes = studentClassMapper.selectList(w);
        if (classes == null || classes.isEmpty()) {
            return Collections.emptySet();
        }
        return classes.stream().map(StudentClass::getId).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<Long> listTeacherAllStudentIds(Long teacherId) {
        Set<Long> classIds = listTeacherClassIds(teacherId);
        if (classIds.isEmpty()) {
            return Collections.emptySet();
        }
        QueryWrapper<StudentClassRelation> w = new QueryWrapper<>();
        w.in("class_id", classIds);
        List<StudentClassRelation> rows = studentClassRelationMapper.selectList(w);
        if (rows == null || rows.isEmpty()) {
            return Collections.emptySet();
        }
        return rows.stream().map(StudentClassRelation::getStudentId).filter(Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static String normalizeTeachingDimension(String dimension) {
        if (dimension == null || dimension.isBlank()) {
            return "all";
        }
        String d = dimension.trim().toLowerCase();
        if ("by_class".equals(d) || "class".equals(d)) {
            return d;
        }
        return "all";
    }

    private List<Long> listStudentIdsByClassId(Long classId) {
        if (classId == null) {
            return Collections.emptyList();
        }
        QueryWrapper<StudentClassRelation> w = new QueryWrapper<>();
        w.eq("class_id", classId);
        List<StudentClassRelation> rows = studentClassRelationMapper.selectList(w);
        if (rows == null || rows.isEmpty()) {
            return Collections.emptyList();
        }
        return rows.stream().map(StudentClassRelation::getStudentId).filter(Objects::nonNull).toList();
    }

    private Map<Long, String> loadClassNameMap(List<Long> classIds) {
        if (classIds == null || classIds.isEmpty()) {
            return Collections.emptyMap();
        }
        QueryWrapper<StudentClass> w = new QueryWrapper<>();
        w.in("id", classIds);
        List<StudentClass> list = studentClassMapper.selectList(w);
        if (list == null || list.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, String> map = new HashMap<>();
        for (StudentClass c : list) {
            map.put(c.getId(), c.getClassName());
        }
        return map;
    }

    private String resolvePracticeCreatorName(Long creatorId) {
        if (creatorId == null) {
            return null;
        }
        try {
            User creator = userService.getUserEntityById(creatorId);
            return creator != null ? creator.getName() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private List<PracticeProgressItemVO> buildPracticeProgressGlobal(List<PracticeProblem> problemLinks) {
        List<PracticeProgressItemVO> progressList = new ArrayList<>();
        for (PracticeProblem pp : problemLinks) {
            Long solvedCount = userSolvedProblemMapper.countDistinctUsersByProblemId(pp.getProblemId());
            if (solvedCount == null) {
                solvedCount = 0L;
            }
            ProblemVo pvo = null;
            try {
                pvo = problemService.getProblemInfo(pp.getProblemId(), 0L, null);
            } catch (Exception ignored) {
            }
            progressList.add(new PracticeProgressItemVO(
                    pp.getProblemId(),
                    pvo != null ? pvo.getTitle() : "题目#" + pp.getProblemId(),
                    solvedCount
            ));
        }
        return progressList;
    }

    private List<PracticeProgressItemVO> buildPracticeProgressForUserScope(List<PracticeProblem> problemLinks, List<Long> userIds) {
        List<PracticeProgressItemVO> progressList = new ArrayList<>();
        for (PracticeProblem pp : problemLinks) {
            Long solvedCount = userSolvedProblemMapper.countDistinctUsersByProblemIdFiltered(pp.getProblemId(), userIds);
            if (solvedCount == null) {
                solvedCount = 0L;
            }
            ProblemVo pvo = null;
            try {
                pvo = problemService.getProblemInfo(pp.getProblemId(), 0L, null);
            } catch (Exception ignored) {
            }
            progressList.add(new PracticeProgressItemVO(
                    pp.getProblemId(),
                    pvo != null ? pvo.getTitle() : "题目#" + pp.getProblemId(),
                    solvedCount
            ));
        }
        return progressList;
    }

    @Override
    public AiLearningContextVO getAiLearningContext(Long userId) {
        if (userId == null) {
            throw new BusinessException("请指定用户或登录后查看");
        }
        User user = userService.getUserEntityById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        long totalSubmit = user.getSubmitCount() != null ? user.getSubmitCount().longValue() : 0;
        long totalSolved = 0;
        List<UserSolvedProblem> solvedList = userService.getSolveProblem(userId);
        if (solvedList != null) {
            totalSolved = solvedList.size();
        }
        double passRate = totalSubmit > 0
                ? (100.0 * (user.getPassCount() != null ? user.getPassCount().longValue() : 0) / totalSubmit)
                : 0.0;

        // 错误类型分布
        List<ErrorPatternStatVO> errorPatterns = submissionMapper.countErrorsByUser(userId);
        if (errorPatterns == null) {
            errorPatterns = new ArrayList<>();
        }

        // 最近错误提交
        List<Submission> recentErrorSubs = submissionMapper.recentErrorSubmissions(userId, 10);
        List<AiLearningContextVO.RecentErrorItem> recentErrors = new ArrayList<>();
        if (recentErrorSubs != null) {
            for (Submission s : recentErrorSubs) {
                recentErrors.add(new AiLearningContextVO.RecentErrorItem(
                        s.getPid(),
                        s.getProblemName(),
                        s.getStatus(),
                        s.getLanguage(),
                        s.getCreateTime()
                ));
            }
        }

        // 已通过题目（含难度和标签）
        List<SolvedProblemItemVO> solvedProblems = new ArrayList<>();
        if (solvedList != null && !solvedList.isEmpty()) {
            for (UserSolvedProblem usp : solvedList) {
                try {
                    ProblemVo pvo = problemService.getProblemInfo(usp.getProblemId(), 0L, null);
                    List<String> tags = problemTagService.getTagNames(usp.getProblemId());
                    solvedProblems.add(new SolvedProblemItemVO(
                            usp.getProblemId(),
                            pvo != null ? pvo.getTitle() : "",
                            pvo != null ? pvo.getDifficulty() : null,
                            tags != null ? tags : Collections.emptyList()
                    ));
                } catch (Exception ignored) {
                    solvedProblems.add(new SolvedProblemItemVO(usp.getProblemId(), "", null, Collections.emptyList()));
                }
            }
        }

        // 练习完成进度
        List<com.example.vnollxonlinejudge.model.vo.practice.PracticeVo> practiceList = practiceService.getStudentPracticeProgress(userId);
        List<AiLearningContextVO.PracticeProgressSummary> practiceProgress = new ArrayList<>();
        if (practiceList != null) {
            for (com.example.vnollxonlinejudge.model.vo.practice.PracticeVo p : practiceList) {
                practiceProgress.add(new AiLearningContextVO.PracticeProgressSummary(
                        p.getId(),
                        p.getTitle(),
                        p.getProblemCount(),
                        p.getSolvedCount(),
                        p.getCreatorName()
                ));
            }
        }

        return AiLearningContextVO.builder()
                .userId(userId)
                .userName(user.getName())
                .totalSubmit(totalSubmit)
                .totalSolved(totalSolved)
                .passRate(Math.round(passRate * 10) / 10.0)
                .errorPatterns(errorPatterns)
                .recentErrors(recentErrors)
                .solvedProblems(solvedProblems)
                .practiceProgress(practiceProgress)
                .build();
    }
}
