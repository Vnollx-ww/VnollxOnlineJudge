package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.dto.request.user.*;
import com.example.vnollxonlinejudge.model.dto.response.user.UserResponse;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import com.example.vnollxonlinejudge.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;
import com.example.vnollxonlinejudge.common.result.Result;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;


@RestController
@RequestMapping("/user")
public class UserController {
    @Autowired
    private UserService userService;
    private Long getCurrentUserId(HttpServletRequest request) {
        String userId = (String) request.getAttribute("uid");
        if (userId == null || userId.trim().isEmpty()) {
            throw new BusinessException("未获取到用户ID");
        }
        try {
            return Long.parseLong(userId);
        } catch (NumberFormatException e) {
            throw new BusinessException("用户ID格式错误");
        }
    }
    @GetMapping("/{id}")
    public ModelAndView userDetail(@PathVariable Long id) {
        UserResponse data=userService.getUserById(id);
        ModelAndView modelAndView = new ModelAndView();
        modelAndView.addObject("user", data);
        modelAndView.setViewName("user");
        return modelAndView;
    }
    @PostMapping("/login")
    public Result<String> login(@RequestBody LoginRequest request){
        String token = userService.login(request.getEmail(), request.getPassword());
        return Result.Success(token, "登录成功");
    }

    @PostMapping("/register")
    public Result<Void> register(@Valid @RequestBody RegisterRequest request) {
        userService.register(request.getName(), request.getPassword(), request.getEmail(), request.getVerifyCode());
        return Result.Success("注册成功");
    }
    @GetMapping("/profile")
    public Result<UserResponse> getCurrentUser(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        UserResponse user = userService.getUserById(userId);
        return Result.Success(user, "获取用户信息成功");
    }
    @GetMapping("/solved-problems")
    public Result<List<UserSolvedProblem>> getSolveProblem(@RequestParam String uid){
        List<UserSolvedProblem> userSolvedProblems=userService.getSolveProblem(Long.parseLong(uid));
        return Result.Success(userSolvedProblems,"获取用户AC列表成功");
    }

    @PutMapping("/update/password")
    public Result<Void> updatePassword(@Valid @RequestBody UpdatePasswordRequest request,
                                       HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        userService.updatePassword(request.getOldPassword(), request.getNewPassword(), userId);
        return Result.Success("修改密码成功");
    }
    @PutMapping("/update/profile")
    public Result<Void> updateUserInfo(@Valid @RequestBody UpdateUserInfoRequest request,
                                       HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        userService.updateUserInfo(request.getEmail(), request.getName(), userId, request.getOption(),request.getVerifyCode());
        return Result.Success("修改个人信息成功");
    }
    @GetMapping("/list")
    public Result<List<UserResponse>> getAllUser(){
            return Result.Success(userService.getAllUser(),"获取用户列表成功");
    }
    @GetMapping("/count")
    public Result<Long> getCount(){
        return Result.Success(userService.getCount(),"获取用户数量成功");
    }
    @PutMapping("/forget")
    public Result<Void> forgetPassword(@RequestBody ForgetPasswordRequest req){
        userService.forgetPassword(req.getNewPassword(),req.getEmail(),req.getVerifyCode());
        return Result.Success("修改密码成功");
    }
}
