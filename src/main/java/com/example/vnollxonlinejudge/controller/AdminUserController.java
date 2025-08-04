package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.dto.request.admin.AdminSaveUserRequest;
import com.example.vnollxonlinejudge.model.dto.response.user.UserResponse;
import com.example.vnollxonlinejudge.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/admin/user")
@Validated
public class AdminUserController {
    @Autowired
    private UserService userService;

    /**
     * 提取当前管理员ID的公共方法
     */
    private Long getCurrentAdminId(HttpServletRequest request) {
        String userId = (String) request.getAttribute("uid");
        if (userId == null || userId.trim().isEmpty()) {
            throw new BusinessException("未获取到管理员ID");
        }

        try {
            return Long.parseLong(userId);
        } catch (NumberFormatException e) {
            throw new BusinessException("管理员ID格式错误");
        }
    }
    @GetMapping("/list")
    public Result<List<UserResponse>> getUserList(@RequestParam int pageNum, @RequestParam int pageSize,
                                                  @RequestParam(required = false) String keyword,
                                                  HttpServletRequest httpRequest) {
        Long uid=getCurrentAdminId(httpRequest);
        List<UserResponse> users=userService.getAllUserByAdmin(
                pageNum,pageSize,
                keyword,uid
        );
        return Result.Success(users, "获取用户列表成功");
    }

    /**
     * 获取用户总数（用于分页）
     */
    @GetMapping("/count")
    public Result<Long> getUserCount(@RequestParam(required = false) String keyword,
                                     HttpServletRequest request) {
        Long adminId = getCurrentAdminId(request);
        String identity = (String) request.getAttribute("identity");
        Long count =  userService.getCountByAdmin(keyword, identity);
        return Result.Success(count, "获取搜索用户总数成功");
    }

    /**
     * 创建用户
     */
    @PostMapping("/add")
    public Result<Void> createUser(@Valid @RequestBody AdminSaveUserRequest request) {
        userService.addUserByAdmin(request.getName(), request.getEmail(), request.getIdentity());
        return Result.Success("添加用户成功");
    }

    /**
     * 更新用户信息
     */
    @PutMapping("/update")
    public Result<Void> updateUser(@Valid @RequestBody AdminSaveUserRequest request) {
        // 确保路径参数和请求体中的ID一致

        userService.updateUserInfoByAdmin(
                request.getEmail(),
                request.getName(),
                request.getIdentity(),
                request.getId()
        );
        return Result.Success("修改用户信息成功");
    }

    /**
     * 删除用户
     */
    @DeleteMapping("/delete/{id}")
    public Result<Void> deleteUser(@PathVariable @NotNull @Min(1) Long id) {
        userService.deleteUserByAdmin(id);
        return Result.Success("删除用户成功");
    }


}
