package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.entity.StudentClass;
import com.example.vnollxonlinejudge.model.vo.studentclass.StudentClassStudentVo;
import com.example.vnollxonlinejudge.model.vo.studentclass.StudentClassVo;

import java.util.List;
import java.util.Collection;
public interface StudentClassService {
    List<StudentClassVo> getClassList(Long currentUserId, String currentIdentity);
    void createClass(String className, Long teacherId, Long currentUserId, String currentIdentity);
    void updateClass(Long id, String className, Long teacherId, Long currentUserId, String currentIdentity);
    void deleteClass(Long id, Long currentUserId, String currentIdentity);
    List<StudentClassStudentVo> getStudentsByClassId(Long classId, Long currentUserId, String currentIdentity);
    List<StudentClassStudentVo> getAssignableStudents(String keyword, Long currentUserId, String currentIdentity);
    void assignStudents(Long classId, List<Long> studentIds, Long currentUserId, String currentIdentity);
    void removeStudent(Long classId, Long studentId, Long currentUserId, String currentIdentity);
    Long getStudentClassId(Long studentId);
    StudentClass getStudentClassByStudentId(Long studentId);
    List<StudentClass> getClassesByIds(Collection<Long> classIds);
    void validateVisibleClassIds(List<Long> classIds, Long currentUserId, String currentIdentity);
}
