package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.example.vnollxonlinejudge.model.base.RoleCode;
import com.example.vnollxonlinejudge.model.dto.admin.AdminAssignStudentsDTO;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveStudentClassDTO;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.studentclass.StudentClassStudentVo;
import com.example.vnollxonlinejudge.model.vo.studentclass.StudentClassVo;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import com.example.vnollxonlinejudge.service.StudentClassService;
import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/student-class")
@Validated
public class AdminStudentClassController {

    private final StudentClassService studentClassService;
    private final UserService userService;

    @Autowired
    public AdminStudentClassController(StudentClassService studentClassService, UserService userService) {
        this.studentClassService = studentClassService;
        this.userService = userService;
    }

    @GetMapping("/list")
    @RequirePermission(PermissionCode.CLASS_VIEW)
    public Result<List<StudentClassVo>> getClassList() {
        return Result.Success(
                studentClassService.getClassList(UserContextHolder.getCurrentUserId(), UserContextHolder.getCurrentUserIdentity()),
                "获取班级列表成功"
        );
    }

    @PostMapping("/create")
    @RequirePermission(PermissionCode.CLASS_CREATE)
    public Result<Void> createClass(@RequestBody AdminSaveStudentClassDTO req) {
        studentClassService.createClass(
                req.getClassName(),
                req.getTeacherId(),
                UserContextHolder.getCurrentUserId(),
                UserContextHolder.getCurrentUserIdentity()
        );
        return Result.Success("创建班级成功");
    }

    @PutMapping("/update")
    @RequirePermission(PermissionCode.CLASS_UPDATE)
    public Result<Void> updateClass(@RequestBody AdminSaveStudentClassDTO req) {
        studentClassService.updateClass(
                req.getId(),
                req.getClassName(),
                req.getTeacherId(),
                UserContextHolder.getCurrentUserId(),
                UserContextHolder.getCurrentUserIdentity()
        );
        return Result.Success("更新班级成功");
    }

    @DeleteMapping("/delete/{id}")
    @RequirePermission(PermissionCode.CLASS_DELETE)
    public Result<Void> deleteClass(@PathVariable Long id) {
        studentClassService.deleteClass(id, UserContextHolder.getCurrentUserId(), UserContextHolder.getCurrentUserIdentity());
        return Result.Success("删除班级成功");
    }

    @GetMapping("/{id}/students")
    @RequirePermission(PermissionCode.CLASS_VIEW)
    public Result<List<StudentClassStudentVo>> getClassStudents(@PathVariable Long id) {
        return Result.Success(
                studentClassService.getStudentsByClassId(id, UserContextHolder.getCurrentUserId(), UserContextHolder.getCurrentUserIdentity()),
                "获取班级学生成功"
        );
    }

    @GetMapping("/students/assignable")
    @RequirePermission(PermissionCode.CLASS_VIEW)
    public Result<List<StudentClassStudentVo>> getAssignableStudents(@RequestParam(required = false) String keyword) {
        return Result.Success(
                studentClassService.getAssignableStudents(keyword, UserContextHolder.getCurrentUserId(), UserContextHolder.getCurrentUserIdentity()),
                "获取可分配学生成功"
        );
    }

    @PostMapping("/{id}/students")
    @RequirePermission(PermissionCode.CLASS_UPDATE)
    public Result<Void> assignStudents(@PathVariable Long id, @RequestBody AdminAssignStudentsDTO req) {
        studentClassService.assignStudents(
                id,
                req.getStudentIds(),
                UserContextHolder.getCurrentUserId(),
                UserContextHolder.getCurrentUserIdentity()
        );
        return Result.Success("分配学生成功");
    }

    @DeleteMapping("/{id}/students/{studentId}")
    @RequirePermission(PermissionCode.CLASS_UPDATE)
    public Result<Void> removeStudent(@PathVariable Long id, @PathVariable Long studentId) {
        studentClassService.removeStudent(id, studentId, UserContextHolder.getCurrentUserId(), UserContextHolder.getCurrentUserIdentity());
        return Result.Success("移出学生成功");
    }

    @GetMapping("/teachers")
    @RequirePermission(PermissionCode.CLASS_VIEW)
    public Result<List<UserVo>> getTeachers() {
        return Result.Success(
                userService.getUsersByIdentity(RoleCode.TEACHER).stream().map(UserVo::new).toList(),
                "获取教师列表成功"
        );
    }
}
