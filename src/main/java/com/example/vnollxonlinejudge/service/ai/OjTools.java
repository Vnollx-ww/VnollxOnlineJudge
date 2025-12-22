package com.example.vnollxonlinejudge.service.ai;

import com.alibaba.fastjson2.JSON;
import com.example.vnollxonlinejudge.model.query.SubmissionQuery;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionVo;
import com.example.vnollxonlinejudge.model.vo.notification.NotificationVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.submission.SubmissionVo;
import com.example.vnollxonlinejudge.model.vo.tag.TagVo;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import com.example.vnollxonlinejudge.model.vo.practice.PracticeVo;
import com.example.vnollxonlinejudge.model.vo.solve.SolveVo;
import com.example.vnollxonlinejudge.service.*;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * OJ系统工具集 - 供AI调用查询系统数据
 */
@Component
public class OjTools {
    private static final Logger logger = LoggerFactory.getLogger(OjTools.class);

    private final UserService userService;
    private final ProblemService problemService;
    private final SubmissionService submissionService;
    private final CompetitionService competitionService;
    private final NotificationService notificationService;
    private final TagService tagService;
    private final SolveService solveService;
    private final UserTagService userTagService;
    private final PracticeService practiceService;

    public OjTools(UserService userService,
                   ProblemService problemService,
                   SubmissionService submissionService,
                   CompetitionService competitionService,
                   NotificationService notificationService,
                   TagService tagService,
                   SolveService solveService,
                   UserTagService userTagService,
                   PracticeService practiceService) {
        this.userService = userService;
        this.problemService = problemService;
        this.submissionService = submissionService;
        this.competitionService = competitionService;
        this.notificationService = notificationService;
        this.tagService = tagService;
        this.solveService = solveService;
        this.userTagService = userTagService;
        this.practiceService = practiceService;
    }

    // 当前用户ID，由AiServiceImpl在每次调用前设置
    private static final ThreadLocal<Long> currentUserId = new ThreadLocal<>();

    public void setCurrentUserId(Long userId) {
        currentUserId.set(userId);
    }

    public Long getCurrentUserId() {
        return currentUserId.get();
    }

    public void clearCurrentUserId() {
        currentUserId.remove();
    }

    // ==================== 用户相关 ====================

    @Tool("查询用户个人信息，包括用户名、邮箱、签名、提交数、通过数等")
    public String getUserProfile(@P("用户ID") Long uid) {
        try {
            logger.info("AI调用工具: getUserProfile, uid={}", uid);
            UserVo user = userService.getUserById(uid);
            return JSON.toJSONString(user);
        } catch (Exception e) {
            logger.error("getUserProfile 失败: {}", e.getMessage());
            return "{\"error\": \"查询用户信息失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("查询用户通过的所有题目列表")
    public String getUserSolvedProblems(@P("用户ID") Long uid) {
        try {
            logger.info("AI调用工具: getUserSolvedProblems, uid={}", uid);
            List<UserSolvedProblem> problems = userService.getSolveProblem(uid);
            return JSON.toJSONString(problems);
        } catch (Exception e) {
            logger.error("getUserSolvedProblems 失败: {}", e.getMessage());
            return "{\"error\": \"查询用户通过题目失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("查询用户在各个标签的提交次数和通过次数，用于分析算法水平和做题倾向")
    public String getUserProgress(@P("用户ID") Long uid) {
        try {
            logger.info("AI调用工具: getUserProgress, uid={}", uid);
            var progress = userTagService.getUserTagPassStatusList(uid);
            return JSON.toJSONString(progress);
        } catch (Exception e) {
            logger.error("getUserProgress 失败: {}", e.getMessage());
            return "{\"error\": \"查询用户进度失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("获取系统用户总数")
    public String getUserCount() {
        try {
            logger.info("AI调用工具: getUserCount");
            Long count = userService.getCount();
            return "{\"count\": " + count + "}";
        } catch (Exception e) {
            logger.error("getUserCount 失败: {}", e.getMessage());
            return "{\"error\": \"查询用户数量失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("获取所有用户列表")
    public String getAllUsers() {
        try {
            logger.info("AI调用工具: getAllUsers");
            List<UserVo> users = userService.getAllUser();
            Map<String, Object> result = new HashMap<>();
            result.put("total", users.size());
            result.put("users", users);
            return JSON.toJSONString(result);
        } catch (Exception e) {
            logger.error("getAllUsers 失败: {}", e.getMessage());
            return "{\"error\": \"获取用户列表失败: " + e.getMessage() + "\"}";
        }
    }

    // ==================== 题目相关 ====================

    @Tool("根据题目名称查询题目详情，包括题目描述、输入输出格式、样例等")
    public String getProblemByName(@P("题目名称") String name) {
        try {
            logger.info("AI调用工具: getProblemByName, name={}", name);
            ProblemVo problem = problemService.getProblemInfo(null, null, name);
            return JSON.toJSONString(problem);
        } catch (Exception e) {
            logger.error("getProblemByName 失败: {}", e.getMessage());
            return "{\"error\": \"查询题目失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("根据题目ID查询题目详情")
    public String getProblemById(@P("题目ID") Long pid) {
        try {
            logger.info("AI调用工具: getProblemById, pid={}", pid);
            ProblemVo problem = problemService.getProblemInfo(pid, null, null);
            return JSON.toJSONString(problem);
        } catch (Exception e) {
            logger.error("getProblemById 失败: {}", e.getMessage());
            return "{\"error\": \"查询题目失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("查询题目的标签列表")
    public String getProblemTags(@P("题目ID") Long pid) {
        try {
            logger.info("AI调用工具: getProblemTags, pid={}", pid);
            List<String> tags = problemService.getTagNames(pid);
            return JSON.toJSONString(tags);
        } catch (Exception e) {
            logger.error("getProblemTags 失败: {}", e.getMessage());
            return "{\"error\": \"查询题目标签失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("搜索题目列表，可根据关键字搜索")
    public String searchProblems(@P("搜索关键字，可为空") String keyword) {
        try {
            logger.info("AI调用工具: searchProblems, keyword={}", keyword);
            List<ProblemVo> problems = problemService.getProblemList(keyword, null, 0, 50, true);
            Map<String, Object> result = new HashMap<>();
            result.put("total", problems.size());
            result.put("problems", problems);
            return JSON.toJSONString(result);
        } catch (Exception e) {
            logger.error("searchProblems 失败: {}", e.getMessage());
            return "{\"error\": \"搜索题目失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("获取系统题目总数")
    public String getProblemCount() {
        try {
            logger.info("AI调用工具: getProblemCount");
            Long count = problemService.getCount(null, null, true);
            return "{\"count\": " + count + "}";
        } catch (Exception e) {
            logger.error("getProblemCount 失败: {}", e.getMessage());
            return "{\"error\": \"查询题目数量失败: " + e.getMessage() + "\"}";
        }
    }

    // ==================== 提交记录相关 ====================

    @Tool("查询用户的提交记录列表")
    public String getUserSubmissions(@P("用户ID") Long uid, @P("页码，从1开始") int pageNum, @P("每页数量") int pageSize) {
        try {
            logger.info("AI调用工具: getUserSubmissions, uid={}, pageNum={}, pageSize={}", uid, pageNum, pageSize);
            SubmissionQuery query = new SubmissionQuery();
            query.setUid(uid);
            query.setPageNum(pageNum);
            query.setPageSize(pageSize);
            List<SubmissionVo> submissions = submissionService.getSubmissionList(query);
            Long total = submissionService.getCount(query);
            Map<String, Object> result = new HashMap<>();
            result.put("total", total);
            result.put("submissions", submissions);
            return JSON.toJSONString(result);
        } catch (Exception e) {
            logger.error("getUserSubmissions 失败: {}", e.getMessage());
            return "{\"error\": \"查询提交记录失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("根据提交ID查询提交详情")
    public String getSubmissionById(@P("提交记录ID") Long id) {
        try {
            logger.info("AI调用工具: getSubmissionById, id={}", id);
            SubmissionVo submission = submissionService.getSubmissionById(id);
            return JSON.toJSONString(submission);
        } catch (Exception e) {
            logger.error("getSubmissionById 失败: {}", e.getMessage());
            return "{\"error\": \"查询提交详情失败: " + e.getMessage() + "\"}";
        }
    }

    // ==================== 比赛相关 ====================

    @Tool("查询比赛列表")
    public String getCompetitionList() {
        try {
            logger.info("AI调用工具: getCompetitionList");
            List<CompetitionVo> competitions = competitionService.getCompetitionList(1, 50, null);
            return JSON.toJSONString(competitions);
        } catch (Exception e) {
            logger.error("getCompetitionList 失败: {}", e.getMessage());
            return "{\"error\": \"查询比赛列表失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("根据比赛ID查询比赛详情")
    public String getCompetitionById(@P("比赛ID") Long cid) {
        try {
            logger.info("AI调用工具: getCompetitionById, cid={}", cid);
            CompetitionVo competition = competitionService.getCompetitionById(cid);
            return JSON.toJSONString(competition);
        } catch (Exception e) {
            logger.error("getCompetitionById 失败: {}", e.getMessage());
            return "{\"error\": \"查询比赛详情失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("获取系统比赛总数")
    public String getCompetitionCount() {
        try {
            logger.info("AI调用工具: getCompetitionCount");
            Long count = competitionService.getCompetitionCount();
            return "{\"count\": " + count + "}";
        } catch (Exception e) {
            logger.error("getCompetitionCount 失败: {}", e.getMessage());
            return "{\"error\": \"查询比赛数量失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("获取比赛的题目列表（注意：比赛进行中时不应该调用此方法，防止作弊）")
    public String getCompetitionProblems(@P("比赛ID") Long cid) {
        try {
            logger.info("AI调用工具: getCompetitionProblems, cid={}", cid);
            List<ProblemVo> problems = competitionService.getProblemList(cid);
            Map<String, Object> result = new HashMap<>();
            result.put("total", problems.size());
            result.put("problems", problems);
            return JSON.toJSONString(result);
        } catch (Exception e) {
            logger.error("getCompetitionProblems 失败: {}", e.getMessage());
            return "{\"error\": \"获取比赛题目失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("获取参加比赛的用户列表")
    public String getCompetitionUsers(@P("比赛ID") Long cid) {
        try {
            logger.info("AI调用工具: getCompetitionUsers, cid={}", cid);
            List<UserVo> users = competitionService.getUserList(cid);
            Map<String, Object> result = new HashMap<>();
            result.put("total", users.size());
            result.put("users", users);
            return JSON.toJSONString(result);
        } catch (Exception e) {
            logger.error("getCompetitionUsers 失败: {}", e.getMessage());
            return "{\"error\": \"获取比赛用户失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("检查比赛是否正在进行中")
    public String checkCompetitionIsOpen(@P("比赛ID") Long cid) {
        try {
            logger.info("AI调用工具: checkCompetitionIsOpen, cid={}", cid);
            String now = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            try {
                competitionService.judgeIsOpenById(now, cid);
                return "{\"isOpen\": true, \"message\": \"比赛正在进行中\"}";
            } catch (Exception ex) {
                return "{\"isOpen\": false, \"message\": \"比赛未开始或已结束\"}";
            }
        } catch (Exception e) {
            logger.error("checkCompetitionIsOpen 失败: {}", e.getMessage());
            return "{\"error\": \"检查比赛状态失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("检查比赛是否已经结束")
    public String checkCompetitionIsEnd(@P("比赛ID") Long cid) {
        try {
            logger.info("AI调用工具: checkCompetitionIsEnd, cid={}", cid);
            String now = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            try {
                competitionService.judgeIsEndById(now, cid);
                return "{\"isEnd\": false, \"message\": \"比赛尚未结束\"}";
            } catch (Exception ex) {
                return "{\"isEnd\": true, \"message\": \"比赛已结束\"}";
            }
        } catch (Exception e) {
            logger.error("checkCompetitionIsEnd 失败: {}", e.getMessage());
            return "{\"error\": \"检查比赛状态失败: " + e.getMessage() + "\"}";
        }
    }

    // ==================== 通知相关 ====================

    @Tool("查询用户的通知列表")
    public String getUserNotifications(@P("用户ID") Long uid, @P("通知状态：true已读/false未读，null为全部") String status) {
        try {
            logger.info("AI调用工具: getUserNotifications, uid={}, status={}", uid, status);
            List<NotificationVo> notifications = notificationService.getNotificationList(uid, 1, 20, null, status);
            Long count = notificationService.getNotificationCount(uid, status, null);
            Map<String, Object> result = new HashMap<>();
            result.put("total", count);
            result.put("notifications", notifications);
            return JSON.toJSONString(result);
        } catch (Exception e) {
            logger.error("getUserNotifications 失败: {}", e.getMessage());
            return "{\"error\": \"查询通知失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("查询用户未读通知数量")
    public String getUnreadNotificationCount(@P("用户ID") Long uid) {
        try {
            logger.info("AI调用工具: getUnreadNotificationCount, uid={}", uid);
            Long count = notificationService.getNotificationCount(uid, "false", null);
            return "{\"unreadCount\": " + count + "}";
        } catch (Exception e) {
            logger.error("getUnreadNotificationCount 失败: {}", e.getMessage());
            return "{\"error\": \"查询未读通知数量失败: " + e.getMessage() + "\"}";
        }
    }

    // ==================== 标签相关 ====================

    @Tool("获取系统所有标签列表")
    public String getTagList() {
        try {
            logger.info("AI调用工具: getTagList");
            List<TagVo> tags = tagService.getTagList();
            return JSON.toJSONString(tags);
        } catch (Exception e) {
            logger.error("getTagList 失败: {}", e.getMessage());
            return "{\"error\": \"查询标签列表失败: " + e.getMessage() + "\"}";
        }
    }

    // ==================== 题解相关 ====================

    @Tool("查询某道题目的题解列表")
    public String getSolutionsByProblem(@P("题目ID") Long pid) {
        try {
            logger.info("AI调用工具: getSolutionsByProblem, pid={}", pid);
            List<SolveVo> solutions = solveService.getAllSolves(pid);
            Map<String, Object> result = new HashMap<>();
            result.put("total", solutions.size());
            result.put("solutions", solutions);
            return JSON.toJSONString(result);
        } catch (Exception e) {
            logger.error("getSolutionsByProblem 失败: {}", e.getMessage());
            return "{\"error\": \"查询题解列表失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("根据题解ID获取题解详情")
    public String getSolutionById(@P("题解ID") Long id) {
        try {
            logger.info("AI调用工具: getSolutionById, id={}", id);
            SolveVo solution = solveService.getSolve(id);
            return JSON.toJSONString(solution);
        } catch (Exception e) {
            logger.error("getSolutionById 失败: {}", e.getMessage());
            return "{\"error\": \"获取题解详情失败: " + e.getMessage() + "\"}";
        }
    }

    // ==================== 练习相关 ====================

    @Tool("获取公开的练习列表")
    public String getPublicPracticeList(@P("用户ID") Long uid) {
        try {
            logger.info("AI调用工具: getPublicPracticeList, uid={}", uid);
            List<PracticeVo> practices = practiceService.getPublicPracticeList(uid);
            Map<String, Object> result = new HashMap<>();
            result.put("total", practices.size());
            result.put("practices", practices);
            return JSON.toJSONString(result);
        } catch (Exception e) {
            logger.error("getPublicPracticeList 失败: {}", e.getMessage());
            return "{\"error\": \"获取练习列表失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("根据练习ID获取练习详情")
    public String getPracticeById(@P("练习ID") Long id, @P("用户ID") Long uid) {
        try {
            logger.info("AI调用工具: getPracticeById, id={}, uid={}", id, uid);
            PracticeVo practice = practiceService.getPracticeById(id, uid);
            return JSON.toJSONString(practice);
        } catch (Exception e) {
            logger.error("getPracticeById 失败: {}", e.getMessage());
            return "{\"error\": \"获取练习详情失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("获取练习中的题目列表")
    public String getPracticeProblems(@P("练习ID") Long practiceId, @P("用户ID") Long uid) {
        try {
            logger.info("AI调用工具: getPracticeProblems, practiceId={}, uid={}", practiceId, uid);
            List<ProblemVo> problems = practiceService.getProblemList(practiceId, uid);
            Map<String, Object> result = new HashMap<>();
            result.put("total", problems.size());
            result.put("problems", problems);
            return JSON.toJSONString(result);
        } catch (Exception e) {
            logger.error("getPracticeProblems 失败: {}", e.getMessage());
            return "{\"error\": \"获取练习题目失败: " + e.getMessage() + "\"}";
        }
    }

    @Tool("获取练习总数")
    public String getPracticeCount() {
        try {
            logger.info("AI调用工具: getPracticeCount");
            Long count = practiceService.getCount(null);
            return "{\"count\": " + count + "}";
        } catch (Exception e) {
            logger.error("getPracticeCount 失败: {}", e.getMessage());
            return "{\"error\": \"获取练习数量失败: " + e.getMessage() + "\"}";
        }
    }

    // ==================== 通知详情 ====================

    @Tool("根据通知ID获取通知详情")
    public String getNotificationById(@P("通知ID") Long nid) {
        try {
            logger.info("AI调用工具: getNotificationById, nid={}", nid);
            NotificationVo notification = notificationService.getNotificationInfo(nid);
            return JSON.toJSONString(notification);
        } catch (Exception e) {
            logger.error("getNotificationById 失败: {}", e.getMessage());
            return "{\"error\": \"获取通知详情失败: " + e.getMessage() + "\"}";
        }
    }

    // ==================== 辅助方法 ====================

    @Tool("获取当前用户的ID")
    public String getMyUserId() {
        Long uid = getCurrentUserId();
        if (uid != null) {
            return "{\"userId\": " + uid + "}";
        }
        return "{\"error\": \"未获取到当前用户ID\"}";
    }
}
