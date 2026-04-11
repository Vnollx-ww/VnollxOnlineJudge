package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.PracticeMapper;
import com.example.vnollxonlinejudge.model.base.RoleCode;
import com.example.vnollxonlinejudge.model.entity.Practice;
import com.example.vnollxonlinejudge.model.entity.PracticeProblem;
import com.example.vnollxonlinejudge.model.entity.StudentClass;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import com.example.vnollxonlinejudge.model.vo.practice.PracticeVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.service.PracticeProblemService;
import com.example.vnollxonlinejudge.service.PracticeService;
import com.example.vnollxonlinejudge.service.PracticeVisibleClassService;
import com.example.vnollxonlinejudge.service.ProblemService;
import com.example.vnollxonlinejudge.service.StudentClassService;
import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.service.UserSolvedProblemService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PracticeServiceImpl extends ServiceImpl<PracticeMapper, Practice> implements PracticeService {

    private final PracticeProblemService practiceProblemService;
    private final ProblemService problemService;
    private final UserSolvedProblemService userSolvedProblemService;
    private final UserService userService;
    private final PracticeVisibleClassService practiceVisibleClassService;
    private final StudentClassService studentClassService;

    @Autowired
    public PracticeServiceImpl(
            @Lazy PracticeProblemService practiceProblemService,
            ProblemService problemService,
            UserSolvedProblemService userSolvedProblemService,
            @Lazy UserService userService,
            PracticeVisibleClassService practiceVisibleClassService,
            @Lazy StudentClassService studentClassService
    ) {
        this.practiceProblemService = practiceProblemService;
        this.problemService = problemService;
        this.userSolvedProblemService = userSolvedProblemService;
        this.userService = userService;
        this.practiceVisibleClassService = practiceVisibleClassService;
        this.studentClassService = studentClassService;
    }

    @Override
    @Transactional
    public void createPractice(String title, String description, Boolean isPublic, List<Long> classIds, Long creatorId) {
        boolean pub = isPublic != null ? isPublic : true;
        List<Long> visibleClassIds = pub ? Collections.emptyList() : normalizeClassIds(classIds);
        studentClassService.validateVisibleClassIds(visibleClassIds, creatorId, UserContextHolder.getCurrentUserIdentity());
        Practice practice = new Practice();
        practice.setTitle(title);
        practice.setDescription(description);
        practice.setIsPublic(pub);
        practice.setCreatorId(creatorId);
        practice.setCreateTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        this.save(practice);
        practiceVisibleClassService.replaceVisibleClasses(practice.getId(), visibleClassIds);
    }

    @Override
    @Transactional
    public void updatePractice(Long id, String title, String description, Boolean isPublic, List<Long> classIds) {
        Practice practice = this.getById(id);
        assertManagePermission(practice);
        boolean pub = isPublic != null ? isPublic : true;
        List<Long> visibleClassIds = pub ? Collections.emptyList() : normalizeClassIds(classIds);
        studentClassService.validateVisibleClassIds(
                visibleClassIds,
                UserContextHolder.getCurrentUserId(),
                UserContextHolder.getCurrentUserIdentity()
        );
        practice.setTitle(title);
        practice.setDescription(description);
        practice.setIsPublic(pub);
        this.updateById(practice);
        practiceVisibleClassService.replaceVisibleClasses(id, visibleClassIds);
    }

    @Override
    @Transactional
    public void deletePractice(Long id) {
        Practice practice = this.getById(id);
        assertManagePermission(practice);
        practiceVisibleClassService.deleteByPracticeId(id);
        practiceProblemService.deleteByPracticeId(id);
        this.removeById(id);
    }

    @Override
    public void validateManagePermission(Long practiceId) {
        Practice practice = this.getById(practiceId);
        assertManagePermission(practice);
    }

    @Override
    public List<PracticeVo> getPracticeList(int pageNum, int pageSize, String keyword) {
        QueryWrapper<Practice> wrapper = new QueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.like("title", keyword);
        }
        if (RoleCode.TEACHER.equals(UserContextHolder.getCurrentUserIdentity())) {
            wrapper.eq("creator_id", UserContextHolder.getCurrentUserId());
        }
        wrapper.orderByDesc("create_time");

        List<Practice> practices;
        if (pageNum > 0 && pageSize > 0) {
            Page<Practice> page = new Page<>(pageNum, pageSize);
            practices = this.page(page, wrapper).getRecords();
        } else {
            practices = this.list(wrapper);
        }

        return practices.stream()
                .map(p -> buildPracticeVo(p, Set.of()))
                .collect(Collectors.toList());
    }

    @Override
    public List<PracticeVo> getVisiblePracticeList(Long userId) {
        List<Practice> practices = listOrderedPractices();

        Set<Long> solvedProblemIds = getSolvedProblemIds(userId);

        return practices.stream()
                .filter(p -> isPracticeVisibleToUser(p, userId))
                .map(p -> buildPracticeVo(p, solvedProblemIds))
                .collect(Collectors.toList());
    }

    @Override
    public PracticeVo getPracticeById(Long id, Long userId) {
        Practice practice = this.getById(id);
        if (practice == null) {
            throw new BusinessException("练习不存在");
        }
        if (!isPracticeVisibleToUser(practice, userId)) {
            throw new BusinessException("无权限访问该练习");
        }
        return buildPracticeVo(practice, getSolvedProblemIds(userId));
    }

    @Override
    public Long getCount(String keyword) {
        QueryWrapper<Practice> wrapper = new QueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.like("title", keyword);
        }
        if (RoleCode.TEACHER.equals(UserContextHolder.getCurrentUserIdentity())) {
            wrapper.eq("creator_id", UserContextHolder.getCurrentUserId());
        }
        return this.count(wrapper);
    }

    @Override
    public List<ProblemVo> getProblemList(Long practiceId, Long userId) {
        Practice practice = this.getById(practiceId);
        if (practice == null) {
            throw new BusinessException("练习不存在");
        }
        if (!isPracticeVisibleToUser(practice, userId)) {
            throw new BusinessException("无权限访问该练习");
        }
        List<PracticeProblem> practiceProblems = practiceProblemService.getProblemList(practiceId);

        Set<Long> solvedProblemIds = getSolvedProblemIds(userId);

        List<ProblemVo> result = new ArrayList<>();
        for (PracticeProblem pp : practiceProblems) {
            ProblemVo problemVo = problemService.getProblemInfo(pp.getProblemId(), 0L, null);
            if (problemVo != null) {
                problemVo.setIsSolved(solvedProblemIds.contains(pp.getProblemId()));
                result.add(problemVo);
            }
        }
        return result;
    }
    
    @Override
    public List<PracticeVo> getTeacherPractices(Long teacherId, Long studentUserId) {
        QueryWrapper<Practice> wrapper = new QueryWrapper<>();
        wrapper.eq("creator_id", teacherId);
        wrapper.orderByDesc("create_time");
        List<Practice> practices = this.list(wrapper);

        Set<Long> solvedProblemIds = getSolvedProblemIds(studentUserId);

        return practices.stream()
                .filter(p -> isPracticeVisibleToUser(p, studentUserId))
                .map(p -> buildPracticeVo(p, solvedProblemIds))
                .collect(Collectors.toList());
    }

    @Override
    public List<PracticeVo> getStudentPracticeProgress(Long userId) {
        List<Practice> practices = listOrderedPractices();

        Set<Long> solvedProblemIds = getSolvedProblemIds(userId);

        return practices.stream()
                .filter(p -> isPracticeVisibleToUser(p, userId))
                .map(p -> buildPracticeVo(p, solvedProblemIds))
                .collect(Collectors.toList());
    }

    private PracticeVo buildPracticeVo(Practice practice, Set<Long> solvedProblemIds) {
        List<PracticeProblem> problems = practiceProblemService.getProblemList(practice.getId());
        Integer problemCount = problems.size();
        Integer solvedCount = 0;
        if (solvedProblemIds != null && !solvedProblemIds.isEmpty() && !problems.isEmpty()) {
            solvedCount = (int) problems.stream()
                    .filter(pp -> solvedProblemIds.contains(pp.getProblemId()))
                    .count();
        }
        PracticeVo vo = new PracticeVo(practice, problemCount, solvedCount);
        vo.setCreatorName(getCreatorName(practice.getCreatorId()));
        populateVisibleClasses(vo);
        return vo;
    }

    private List<Practice> listOrderedPractices() {
        QueryWrapper<Practice> wrapper = new QueryWrapper<>();
        wrapper.orderByDesc("create_time");
        return this.list(wrapper);
    }

    /**
     * 可见性规则（公开与班级互斥：公开练习保存时不写入 practice_visible_class）：
     * <ul>
     *   <li>管理员、创建者：始终可见</li>
     *   <li>公开练习：对所有用户可见</li>
     *   <li>私有练习：若在 practice_visible_class 中配置了班级，仅这些班级内学生可见；未配置则学生不可见</li>
     * </ul>
     */
    private boolean isPracticeVisibleToUser(Practice practice, Long userId) {
        String identity = UserContextHolder.getCurrentUserIdentity();
        Long currentUserId = UserContextHolder.getCurrentUserId();
        if (RoleCode.ADMIN.equals(identity) || RoleCode.SUPER_ADMIN.equals(identity)) {
            return true;
        }
        if (currentUserId != null && Objects.equals(practice.getCreatorId(), currentUserId)) {
            return true;
        }

        if (Boolean.TRUE.equals(practice.getIsPublic())) {
            return true;
        }

        Set<Long> visibleClassIds = practiceVisibleClassService.getVisibleClassIds(practice.getId());
        if (visibleClassIds == null || visibleClassIds.isEmpty()) {
            return false;
        }
        if (userId == null) {
            return false;
        }
        StudentClass studentClass = studentClassService.getStudentClassByStudentId(userId);
        if (studentClass == null) {
            return false;
        }
        return visibleClassIds.contains(studentClass.getId());
    }

    private void populateVisibleClasses(PracticeVo vo) {
        List<Long> visibleClassIds = new ArrayList<>(practiceVisibleClassService.getVisibleClassIds(vo.getId()));
        vo.setVisibleClassIds(visibleClassIds);
        if (visibleClassIds.isEmpty()) {
            vo.setVisibleClassNames(Collections.emptyList());
            return;
        }
        Map<Long, String> classNameMap = studentClassService.getClassesByIds(visibleClassIds)
                .stream()
                .collect(Collectors.toMap(StudentClass::getId, StudentClass::getClassName, (a, b) -> a, LinkedHashMap::new));
        vo.setVisibleClassNames(visibleClassIds.stream()
                .map(classNameMap::get)
                .filter(Objects::nonNull)
                .toList());
    }

    private List<Long> normalizeClassIds(List<Long> classIds) {
        if (classIds == null || classIds.isEmpty()) {
            return Collections.emptyList();
        }
        return classIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private void assertManagePermission(Practice practice) {
        if (practice == null) {
            throw new BusinessException("练习不存在");
        }
        String identity = UserContextHolder.getCurrentUserIdentity();
        Long currentUserId = UserContextHolder.getCurrentUserId();
        if (RoleCode.ADMIN.equals(identity) || RoleCode.SUPER_ADMIN.equals(identity)) {
            return;
        }
        if (RoleCode.TEACHER.equals(identity) && Objects.equals(practice.getCreatorId(), currentUserId)) {
            return;
        }
        throw new BusinessException("无权限管理该练习");
    }

    private String getCreatorName(Long creatorId) {
        if (creatorId == null) return null;
        try {
            User user = userService.getUserEntityById(creatorId);
            return user != null ? user.getName() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private Set<Long> getSolvedProblemIds(Long userId) {
        if (userId == null) {
            return Set.of();
        }
        List<UserSolvedProblem> solvedProblems = userSolvedProblemService.getSolveProblem(userId);
        return solvedProblems.stream()
                .map(UserSolvedProblem::getProblemId)
                .collect(Collectors.toSet());
    }
}
