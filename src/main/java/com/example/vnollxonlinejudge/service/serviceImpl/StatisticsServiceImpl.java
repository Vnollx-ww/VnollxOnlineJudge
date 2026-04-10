package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.SubmissionMapper;
import com.example.vnollxonlinejudge.mapper.UserSolvedProblemMapper;
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
import java.util.List;

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

    @Autowired
    public StatisticsServiceImpl(SubmissionMapper submissionMapper,
                                 UserSolvedProblemMapper userSolvedProblemMapper,
                                 SubmissionService submissionService,
                                 UserService userService,
                                 ProblemService problemService,
                                 ProblemTagService problemTagService,
                                 CompetitionService competitionService,
                                 PracticeService practiceService,
                                 PracticeProblemService practiceProblemService) {
        this.submissionMapper = submissionMapper;
        this.userSolvedProblemMapper = userSolvedProblemMapper;
        this.submissionService = submissionService;
        this.userService = userService;
        this.problemService = problemService;
        this.problemTagService = problemTagService;
        this.competitionService = competitionService;
        this.practiceService = practiceService;
        this.practiceProblemService = practiceProblemService;
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
    public LearningAnalyticsVO getLearningAnalytics(Long userId, int days) {
        if (userId == null) {
            throw new BusinessException("请指定用户或登录后查看");
        }
        User user = userService.getUserEntityById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
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
    public List<TeachingProgressVO> getTeachingProgress(Long practiceId) {
        List<TeachingProgressVO> result = new ArrayList<>();
        List<com.example.vnollxonlinejudge.model.vo.practice.PracticeVo> practices;
        if (practiceId != null) {
            com.example.vnollxonlinejudge.model.vo.practice.PracticeVo one = practiceService.getPracticeById(practiceId, null);
            practices = one != null ? List.of(one) : Collections.emptyList();
        } else {
            practices = practiceService.getPracticeList(1, 500, null);
        }
        for (com.example.vnollxonlinejudge.model.vo.practice.PracticeVo p : practices) {
            List<PracticeProblem> problemLinks = practiceProblemService.getProblemList(p.getId());
            List<PracticeProgressItemVO> progressList = new ArrayList<>();
            for (PracticeProblem pp : problemLinks) {
                Long solvedCount = userSolvedProblemMapper.countDistinctUsersByProblemId(pp.getProblemId());
                if (solvedCount == null) solvedCount = 0L;
                ProblemVo pvo = null;
                try {
                    pvo = problemService.getProblemInfo(pp.getProblemId(), 0L, null);
                } catch (Exception ignored) { }
                progressList.add(new PracticeProgressItemVO(
                        pp.getProblemId(),
                        pvo != null ? pvo.getTitle() : "题目#" + pp.getProblemId(),
                        solvedCount
                ));
            }
            String teacherName = null;
            if (p.getCreatorId() != null) {
                try {
                    User creator = userService.getUserEntityById(p.getCreatorId());
                    teacherName = creator != null ? creator.getName() : null;
                } catch (Exception ignored) { }
            }
            result.add(TeachingProgressVO.builder()
                    .practiceId(p.getId())
                    .practiceTitle(p.getTitle())
                    .totalProblems(progressList.size())
                    .creatorId(p.getCreatorId())
                    .creatorName(teacherName)
                    .problemProgressList(progressList)
                    .build());
        }
        return result;
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
