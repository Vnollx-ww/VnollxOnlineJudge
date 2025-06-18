package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.utils.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/user")
public class UserController {
    @Autowired
    private UserService userService;
    @GetMapping("/{id}")
    public ModelAndView userDetail(@PathVariable Long id) {
        Result result = userService.getUserById(id);
        ModelAndView modelAndView = new ModelAndView();
        if (result.getData() == null) {
            modelAndView.setViewName("error/404");
        } else {
            modelAndView.addObject("user", result.getData());
            modelAndView.setViewName("user");
        }
        return modelAndView;
    }
    @PostMapping("/login")
    public Result loginController(@RequestParam String email, @RequestParam String password){
        return userService.loginService(email, password);
    }

    @PostMapping("/register")
    public Result registController(@RequestParam String name, @RequestParam String password,@RequestParam String email){
        return userService.registService(name,password,email);
    }
    @PostMapping("/get")
    public Result getUserById(HttpServletRequest request){
        String userId = (String) request.getAttribute("uid");
        if (userId != null) {
            // 将uid传递给服务层方法
            return userService.getUserById(Integer.parseInt(userId));
        } else {
            // 处理uid为空的情况
            return Result.LogicError("未获取到用户ID");
        }
    }
    @PostMapping("/getsolveproblem")
    public Result getSolveProblem(@RequestParam String uid){
        return userService.getSolveProblem(Long.parseLong(uid));
    }

    @PostMapping("/getlist")
    public Result getAllUser(){
        return userService.getAllUser();
    }

    @PostMapping("/updatepassword")
    public Result updatePassword(@RequestParam String old_password,@RequestParam String password,HttpServletRequest request){
        String userId = (String) request.getAttribute("uid");
        if (userId != null) {
            return userService.updatePassword(old_password,password,Long.parseLong(userId));
        } else {
            return Result.LogicError("未获取到用户ID");
        }
    }
    @PostMapping("/updateuserinfo")
    public Result updateUserInfo(@RequestParam String email,@RequestParam String name,HttpServletRequest request){
        String userId = (String) request.getAttribute("uid");
        if (userId != null) {
            return userService.updateUserInfo(email,name,Long.parseLong(userId));
        } else {
            return Result.LogicError("未获取到用户ID");
        }
    }
}
