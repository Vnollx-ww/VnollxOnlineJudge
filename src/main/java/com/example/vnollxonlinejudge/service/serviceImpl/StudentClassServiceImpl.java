package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.StudentClassMapper;
import com.example.vnollxonlinejudge.mapper.StudentClassRelationMapper;
import com.example.vnollxonlinejudge.mapper.UserMapper;
import com.example.vnollxonlinejudge.model.base.RoleCode;
import com.example.vnollxonlinejudge.model.entity.StudentClass;
import com.example.vnollxonlinejudge.model.entity.StudentClassRelation;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.vo.studentclass.StudentClassStudentVo;
import com.example.vnollxonlinejudge.model.vo.studentclass.StudentClassVo;
import com.example.vnollxonlinejudge.service.PracticeVisibleClassService;
import com.example.vnollxonlinejudge.service.StudentClassService;
import com.example.vnollxonlinejudge.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class StudentClassServiceImpl extends ServiceImpl<StudentClassMapper, StudentClass> implements StudentClassService {

    private final StudentClassRelationMapper studentClassRelationMapper;
    private final UserMapper userMapper;
    private final UserService userService;
    private final PracticeVisibleClassService practiceVisibleClassService;

    @Autowired
    public StudentClassServiceImpl(
            StudentClassRelationMapper studentClassRelationMapper,
            UserMapper userMapper,
            @Lazy UserService userService,
            PracticeVisibleClassService practiceVisibleClassService
    ) {
        this.studentClassRelationMapper = studentClassRelationMapper;
        this.userMapper = userMapper;
        this.userService = userService;
        this.practiceVisibleClassService = practiceVisibleClassService;
    }

    @Override
    public List<StudentClassVo> getClassList(Long currentUserId, String currentIdentity) {
        QueryWrapper<StudentClass> wrapper = new QueryWrapper<>();
        if (RoleCode.TEACHER.equals(currentIdentity)) {
            wrapper.eq("teacher_id", currentUserId);
        }
        wrapper.orderByDesc("create_time");
        List<StudentClass> classes = this.list(wrapper);
        if (classes.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> classIds = classes.stream().map(StudentClass::getId).toList();
        Map<Long, List<Long>> classStudentIdsMap = getClassStudentIdsMap(classIds);
        Set<Long> teacherIds = classes.stream().map(StudentClass::getTeacherId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, User> teacherMap = userService.getUsersByIds(teacherIds)
                .stream()
                .collect(Collectors.toMap(User::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));

        return classes.stream().map(studentClass -> {
            StudentClassVo vo = new StudentClassVo(studentClass);
            List<Long> studentIds = classStudentIdsMap.getOrDefault(studentClass.getId(), Collections.emptyList());
            vo.setStudentIds(studentIds);
            vo.setStudentCount(studentIds.size());
            User teacher = teacherMap.get(studentClass.getTeacherId());
            vo.setTeacherName(teacher != null ? teacher.getName() : null);
            return vo;
        }).toList();
    }

    @Override
    @Transactional
    public void createClass(String className, Long teacherId, Long currentUserId, String currentIdentity) {
        Long resolvedTeacherId = resolveTeacherId(teacherId, currentUserId, currentIdentity);
        ensureUniqueClassName(className, resolvedTeacherId, null);
        StudentClass studentClass = StudentClass.builder()
                .className(className)
                .teacherId(resolvedTeacherId)
                .createTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .build();
        this.save(studentClass);
    }

    @Override
    @Transactional
    public void updateClass(Long id, String className, Long teacherId, Long currentUserId, String currentIdentity) {
        StudentClass studentClass = this.getById(id);
        assertClassManageable(studentClass, currentUserId, currentIdentity);
        Long resolvedTeacherId = resolveTeacherId(teacherId != null ? teacherId : studentClass.getTeacherId(), currentUserId, currentIdentity);
        ensureUniqueClassName(className, resolvedTeacherId, id);
        studentClass.setClassName(className);
        studentClass.setTeacherId(resolvedTeacherId);
        this.updateById(studentClass);
    }

    @Override
    @Transactional
    public void deleteClass(Long id, Long currentUserId, String currentIdentity) {
        StudentClass studentClass = this.getById(id);
        assertClassManageable(studentClass, currentUserId, currentIdentity);
        QueryWrapper<StudentClassRelation> relationWrapper = new QueryWrapper<>();
        relationWrapper.eq("class_id", id);
        studentClassRelationMapper.delete(relationWrapper);
        practiceVisibleClassService.deleteByClassId(id);
        this.removeById(id);
    }

    @Override
    public List<StudentClassStudentVo> getStudentsByClassId(Long classId, Long currentUserId, String currentIdentity) {
        StudentClass studentClass = this.getById(classId);
        assertClassManageable(studentClass, currentUserId, currentIdentity);
        QueryWrapper<StudentClassRelation> wrapper = new QueryWrapper<>();
        wrapper.eq("class_id", classId);
        List<StudentClassRelation> relations = studentClassRelationMapper.selectList(wrapper);
        if (relations.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> studentIds = relations.stream().map(StudentClassRelation::getStudentId).toList();
        Map<Long, User> userMap = userService.getUsersByIds(studentIds)
                .stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return relations.stream()
                .map(relation -> {
                    User user = userMap.get(relation.getStudentId());
                    if (user == null) {
                        return null;
                    }
                    return StudentClassStudentVo.builder()
                            .id(user.getId())
                            .name(user.getName())
                            .email(user.getEmail())
                            .identity(user.getIdentity())
                            .classId(studentClass.getId())
                            .className(studentClass.getClassName())
                            .build();
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @Override
    public List<StudentClassStudentVo> getAssignableStudents(String keyword, Long currentUserId, String currentIdentity) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("identity", RoleCode.USER);
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(qw -> qw.like("name", keyword).or().like("email", keyword));
        }
        wrapper.orderByAsc("name");
        List<User> students = userMapper.selectList(wrapper);
        if (students.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, StudentClass> studentClassMap = getStudentClassMap(students.stream().map(User::getId).toList());
        return students.stream()
                .filter(user -> canAccessStudent(user.getId(), studentClassMap, currentUserId, currentIdentity))
                .map(user -> {
                    StudentClass studentClass = studentClassMap.get(user.getId());
                    return StudentClassStudentVo.builder()
                            .id(user.getId())
                            .name(user.getName())
                            .email(user.getEmail())
                            .identity(user.getIdentity())
                            .classId(studentClass != null ? studentClass.getId() : null)
                            .className(studentClass != null ? studentClass.getClassName() : null)
                            .build();
                })
                .toList();
    }

    @Override
    @Transactional
    public void assignStudents(Long classId, List<Long> studentIds, Long currentUserId, String currentIdentity) {
        StudentClass studentClass = this.getById(classId);
        assertClassManageable(studentClass, currentUserId, currentIdentity);
        if (studentIds == null || studentIds.isEmpty()) {
            return;
        }

        List<Long> distinctStudentIds = studentIds.stream().filter(Objects::nonNull).distinct().toList();
        List<User> students = userService.getUsersByIds(distinctStudentIds);
        if (students.size() != distinctStudentIds.size()) {
            throw new BusinessException("存在无效学生");
        }
        boolean invalidIdentity = students.stream().anyMatch(user -> !RoleCode.USER.equals(user.getIdentity()));
        if (invalidIdentity) {
            throw new BusinessException("只能将学生分配到班级");
        }

        Map<Long, StudentClass> existingClassMap = getStudentClassMap(distinctStudentIds);
        if (RoleCode.TEACHER.equals(currentIdentity)) {
            boolean hasOtherTeacherStudent = existingClassMap.entrySet().stream()
                    .filter(entry -> entry.getValue() != null)
                    .anyMatch(entry -> !Objects.equals(entry.getValue().getTeacherId(), currentUserId) && !Objects.equals(entry.getValue().getId(), classId));
            if (hasOtherTeacherStudent) {
                throw new BusinessException("不能将其他教师班级中的学生直接分配到当前班级");
            }
        }

        QueryWrapper<StudentClassRelation> deleteWrapper = new QueryWrapper<>();
        deleteWrapper.in("student_id", distinctStudentIds);
        studentClassRelationMapper.delete(deleteWrapper);

        List<StudentClassRelation> relations = distinctStudentIds.stream()
                .map(studentId -> StudentClassRelation.builder().classId(classId).studentId(studentId).build())
                .toList();
        relations.forEach(studentClassRelationMapper::insert);
    }

    @Override
    @Transactional
    public void removeStudent(Long classId, Long studentId, Long currentUserId, String currentIdentity) {
        StudentClass studentClass = this.getById(classId);
        assertClassManageable(studentClass, currentUserId, currentIdentity);
        QueryWrapper<StudentClassRelation> wrapper = new QueryWrapper<>();
        wrapper.eq("class_id", classId).eq("student_id", studentId);
        studentClassRelationMapper.delete(wrapper);
    }

    @Override
    public Long getStudentClassId(Long studentId) {
        StudentClass studentClass = getStudentClassByStudentId(studentId);
        return studentClass != null ? studentClass.getId() : null;
    }

    @Override
    public StudentClass getStudentClassByStudentId(Long studentId) {
        QueryWrapper<StudentClassRelation> wrapper = new QueryWrapper<>();
        wrapper.eq("student_id", studentId).last("limit 1");
        StudentClassRelation relation = studentClassRelationMapper.selectOne(wrapper);
        if (relation == null) {
            return null;
        }
        return this.getById(relation.getClassId());
    }

    @Override
    public List<StudentClass> getClassesByIds(Collection<Long> classIds) {
        if (classIds == null || classIds.isEmpty()) {
            return Collections.emptyList();
        }
        return this.listByIds(classIds);
    }

    @Override
    public void validateVisibleClassIds(List<Long> classIds, Long currentUserId, String currentIdentity) {
        if (classIds == null || classIds.isEmpty()) {
            return;
        }
        List<Long> distinctClassIds = classIds.stream().filter(Objects::nonNull).distinct().toList();
        List<StudentClass> classes = this.listByIds(distinctClassIds);
        if (classes.size() != distinctClassIds.size()) {
            throw new BusinessException("存在无效班级");
        }
        if (RoleCode.TEACHER.equals(currentIdentity)) {
            boolean invalidClass = classes.stream().anyMatch(studentClass -> !Objects.equals(studentClass.getTeacherId(), currentUserId));
            if (invalidClass) {
                throw new BusinessException("只能选择自己名下的班级");
            }
        }
    }

    private Long resolveTeacherId(Long teacherId, Long currentUserId, String currentIdentity) {
        Long resolvedTeacherId = RoleCode.TEACHER.equals(currentIdentity) ? currentUserId : teacherId;
        if (resolvedTeacherId == null) {
            throw new BusinessException("请选择教师");
        }
        User teacher = userService.getUserEntityById(resolvedTeacherId);
        if (teacher == null || !RoleCode.TEACHER.equals(teacher.getIdentity())) {
            throw new BusinessException("教师不存在");
        }
        return resolvedTeacherId;
    }

    private void assertClassManageable(StudentClass studentClass, Long currentUserId, String currentIdentity) {
        if (studentClass == null) {
            throw new BusinessException("班级不存在");
        }
        if (RoleCode.TEACHER.equals(currentIdentity) && !Objects.equals(studentClass.getTeacherId(), currentUserId)) {
            throw new BusinessException("无权限操作该班级");
        }
    }

    private void ensureUniqueClassName(String className, Long teacherId, Long classId) {
        QueryWrapper<StudentClass> wrapper = new QueryWrapper<>();
        wrapper.eq("class_name", className).eq("teacher_id", teacherId);
        if (classId != null) {
            wrapper.ne("id", classId);
        }
        if (this.count(wrapper) > 0) {
            throw new BusinessException("同一教师下班级名称不能重复");
        }
    }

    private Map<Long, List<Long>> getClassStudentIdsMap(Collection<Long> classIds) {
        if (classIds == null || classIds.isEmpty()) {
            return Collections.emptyMap();
        }
        QueryWrapper<StudentClassRelation> wrapper = new QueryWrapper<>();
        wrapper.in("class_id", classIds);
        List<StudentClassRelation> relations = studentClassRelationMapper.selectList(wrapper);
        Map<Long, List<Long>> result = new LinkedHashMap<>();
        relations.forEach(relation -> result.computeIfAbsent(relation.getClassId(), key -> new ArrayList<>()).add(relation.getStudentId()));
        return result;
    }

    private Map<Long, StudentClass> getStudentClassMap(Collection<Long> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) {
            return Collections.emptyMap();
        }
        QueryWrapper<StudentClassRelation> wrapper = new QueryWrapper<>();
        wrapper.in("student_id", studentIds);
        List<StudentClassRelation> relations = studentClassRelationMapper.selectList(wrapper);
        if (relations.isEmpty()) {
            return Collections.emptyMap();
        }
        Set<Long> classIds = relations.stream().map(StudentClassRelation::getClassId).collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Long, StudentClass> classMap = this.listByIds(classIds)
                .stream()
                .collect(Collectors.toMap(StudentClass::getId, Function.identity()));
        return relations.stream().collect(Collectors.toMap(StudentClassRelation::getStudentId, relation -> classMap.get(relation.getClassId()), (a, b) -> a));
    }

    private boolean canAccessStudent(Long studentId, Map<Long, StudentClass> studentClassMap, Long currentUserId, String currentIdentity) {
        if (!RoleCode.TEACHER.equals(currentIdentity)) {
            return true;
        }
        StudentClass studentClass = studentClassMap.get(studentId);
        return studentClass == null || Objects.equals(studentClass.getTeacherId(), currentUserId);
    }
}
