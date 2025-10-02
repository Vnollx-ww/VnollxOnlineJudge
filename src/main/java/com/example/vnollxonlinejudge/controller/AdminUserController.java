package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveUserDTO;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/admin/user")
@Validated
public class AdminUserController {
    private final UserService userService;
    
    @Autowired
    public AdminUserController(UserService userService) {
        this.userService = userService;
    }

    private String getCurrentIdentity(HttpServletRequest request) {
        String identity = (String) request.getAttribute("identity");
        if (identity == null || identity.trim().isEmpty()) {
            throw new BusinessException("未获取到管理员身份");
        }
        return identity;
    }
    @GetMapping("/list")
    public Result<List<UserVo>> getUserList(@RequestParam int pageNum, @RequestParam int pageSize,
                                            @RequestParam(required = false) String keyword) {
        Long userId = UserContextHolder.getCurrentUserId();
        List<UserVo> users=userService.getAllUserByAdmin(
                pageNum,pageSize,
                keyword,userId
        );
        return Result.Success(users, "获取用户列表成功");
    }

    /**
     * 获取用户总数（用于分页）
     */
    @GetMapping("/count")
    public Result<Long> getUserCount(@RequestParam(required = false) String keyword,
                                     HttpServletRequest request) {
        String identity = (String) request.getAttribute("identity");
        Long count =  userService.getCountByAdmin(keyword, identity);
        return Result.Success(count, "获取搜索用户总数成功");
    }

    /**
     * 创建用户
     */
    @PostMapping("/add")
    public Result<Void> createUser(@Valid @RequestBody AdminSaveUserDTO request) {
        userService.addUserByAdmin(request.getName(), request.getEmail(), request.getIdentity());
        return Result.Success("添加用户成功");
    }

    /**
     * 更新用户信息
     */
    @PutMapping("/update")
    public Result<Void> updateUser(@Valid @RequestBody AdminSaveUserDTO request,HttpServletRequest req) {
        // 确保路径参数和请求体中的ID一致

        userService.updateUserInfoByAdmin(
                request.getEmail(),
                request.getName(),
                request.getIdentity(),
                request.getId(),
                getCurrentIdentity(req)
        );
        return Result.Success("修改用户信息成功");
    }

    /**
     * 删除用户
     */
    @DeleteMapping("/delete/{id}")
    public Result<Void> deleteUser(@PathVariable @NotNull @Min(1) Long id,HttpServletRequest req) {
        userService.deleteUserByAdmin(id,getCurrentIdentity(req));
        return Result.Success("删除用户成功");
    }


}
