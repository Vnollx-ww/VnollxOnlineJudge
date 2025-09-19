package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.dto.user.*;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import com.example.vnollxonlinejudge.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;
import com.example.vnollxonlinejudge.model.result.Result;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;


@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
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
        UserVo data=userService.getUserById(id);
        ModelAndView modelAndView = new ModelAndView();
        modelAndView.addObject("user", data);
        modelAndView.setViewName("user");
        return modelAndView;
    }
    @PostMapping("/login")
    public Result<String> login(@RequestBody LoginDTO request){
        String token = userService.login(request.getEmail(), request.getPassword());
        return Result.Success(token, "登录成功");
    }

    @PostMapping("/register")
    public Result<Void> register(@Valid @RequestBody RegisterDTO request) {
        userService.register(
                request.getName(), request.getPassword(),
                request.getEmail(), request.getVerifyCode()
        );
        return Result.Success("注册成功");
    }
    @GetMapping("/profile")
    public Result<UserVo> getCurrentUser(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        UserVo user = userService.getUserById(userId);
        return Result.Success(user, "获取用户信息成功");
    }
    @GetMapping("/solved-problems")
    public Result<List<UserSolvedProblem>> getSolveProblem(@RequestParam String uid){
        List<UserSolvedProblem> userSolvedProblems=userService.getSolveProblem(Long.parseLong(uid));
        return Result.Success(userSolvedProblems,"获取用户AC列表成功");
    }

    @PutMapping("/update/password")
    public Result<Void> updatePassword(@Valid @RequestBody UpdatePasswordDTO request,
                                       HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        userService.updatePassword(request.getOldPassword(), request.getNewPassword(), userId);
        return Result.Success("修改密码成功");
    }
    @PutMapping("/update/profile")
    public Result<Void> updateUserInfo(@Valid @ModelAttribute UpdateUserInfoDTO request,
                                       HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        userService.updateUserInfo(
                request.getAvatar(),request.getEmail(), request.getName(),
                request.getSignature(),userId, request.getOption(),
                request.getVerifyCode()
        );
        return Result.Success("修改个人信息成功");
    }
    @GetMapping("/list")
    public Result<List<UserVo>> getAllUser(){
            return Result.Success(userService.getAllUser(),"获取用户列表成功");
    }
    @GetMapping("/count")
    public Result<Long> getCount(){
        return Result.Success(userService.getCount(),"获取用户数量成功");
    }
    @PutMapping("/forget")
    public Result<Void> forgetPassword(@RequestBody ForgetPasswordDTO req){
        userService.forgetPassword(req.getNewPassword(),req.getEmail(),req.getVerifyCode());
        return Result.Success("修改密码成功");
    }
}
