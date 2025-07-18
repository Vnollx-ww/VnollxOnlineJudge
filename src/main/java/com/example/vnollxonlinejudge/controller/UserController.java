package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.aop.annotation.ResponseResult;
import com.example.vnollxonlinejudge.domain.User;
import com.example.vnollxonlinejudge.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;
import com.example.vnollxonlinejudge.common.result.Result;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/user")
public class UserController {
    @Autowired
    private UserService userService;
    @GetMapping("/{id}")
    public ModelAndView userDetail(@PathVariable Long id) {
        User data=userService.getUserById(id);
        ModelAndView modelAndView = new ModelAndView();
        if (data == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("user", data);
            modelAndView.setViewName("user");
        }
        return modelAndView;
    }
    @PostMapping("/login")
    public Result login(@RequestParam String email, @RequestParam String password){
        return Result.Success(userService.login(email,password),"登录成功");
    }

    @PostMapping("/register")
    public Result register(@RequestParam String name, @RequestParam String password,@RequestParam String email){
        userService.register(name,password,email);
        return Result.Success("注册成功");
    }
    @PostMapping("/get")
    public Result getUserById(HttpServletRequest request){
        String userId = (String) request.getAttribute("uid");
        if (userId != null) {
            return Result.Success(userService.getUserById(Integer.parseInt(userId)),"获取用户信息成功");
        } else {
            return Result.LogicError("未获取到用户ID");
        }
    }
    @PostMapping("/getsolveproblem")
    public Result getSolveProblem(@RequestParam String uid){
        return Result.Success(userService.getSolveProblem(Long.parseLong(uid)),"获取用户AC列表成功");
    }

    @PostMapping("/getlist")
    public Result getAllUser(){
        return Result.Success(userService.getAllUser(),"获取用户列表成功");
    }

    @PostMapping("/updatepassword")
    public Result updatePassword(@RequestParam String old_password,@RequestParam String password,HttpServletRequest request){
        String userId = (String) request.getAttribute("uid");
        if (userId != null) {
            userService.updatePassword(old_password,password,Long.parseLong(userId));
            return Result.Success("修改密码成功");
        } else {
            return Result.LogicError("未获取到用户ID");
        }
    }
    @PostMapping("/updateuserinfo")
    public Result updateUserInfo(@RequestParam String email,@RequestParam String name,HttpServletRequest request){
        String userId = (String) request.getAttribute("uid");
        if (userId != null) {
            userService.updateUserInfo(email,name,Long.parseLong(userId));
            return Result.Success("修改个人信息成功");
        } else {
            return Result.LogicError("未获取到用户ID");
        }
    }
}
