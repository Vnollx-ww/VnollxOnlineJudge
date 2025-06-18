package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.dynamic.datasource.annotation.DS;
import com.example.vnollxonlinejudge.domain.User;
import com.example.vnollxonlinejudge.domain.User_Solved_Problems;
import com.example.vnollxonlinejudge.mapper.UserMapper;
import com.example.vnollxonlinejudge.mapper.User_Solver_ProblemsMapper;
import com.example.vnollxonlinejudge.utils.Jwt;
import com.example.vnollxonlinejudge.utils.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.example.vnollxonlinejudge.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Objects;

@Service
public class UserServiceImpl implements UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private User_Solver_ProblemsMapper user_solver_problemsMapper;
    @DS("master")
    @Override
    public Result loginService(String email, String password) {
        User user=userMapper.getUserByEmail(email);
        if(user==null){
            return Result.LogicError("用户不存在");
        }
        String token= Jwt.generateToken(String.valueOf(user.getId()));
        return Result.Success(token,"登录成功");
    }
    @DS("master")
    @Override
    public Result registService(String name, String password, String email) {
        try {
            User user=userMapper.getUserByEmail(email);
            if(user!=null){
                return Result.LogicError("邮箱已存在");
            }
            user=userMapper.getUserByName(name);
            if (user!=null){
                return Result.LogicError("用户名已存在");
            }
        }catch (Exception e){
            logger.error("查询用户失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
        try {
            userMapper.insertUser(name, password,email);
            return Result.Success("注册成功");
        } catch (Exception e) {
            logger.error("用户注册失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @DS("slave")
    @Override
    public Result getUserById(long id){
        try {
            User user=userMapper.getUserById(id);
            if(user==null){
                return Result.LogicError("用户不存在");
            }
            user.setPassword("无权限查看");
            return Result.Success(user,"获取用户信息成功");
        }catch (Exception e){
            logger.error("查询用户失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @DS("slave")
    @Override
    public Result getSolveProblem(long uid){
        try {
            List<User_Solved_Problems> solves=user_solver_problemsMapper.getSolveProblem(uid);
            return Result.Success(solves,"获取用户AC列表成功");
        }catch (Exception e){
            logger.error("查询用户AC列表失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @DS("slave")
    @Override
    public Result getAllUser(){
        try {
            List<User> users=userMapper.getAllUser();
            return Result.Success(users,"获取用户列表成功");
        }catch (Exception e){
            logger.error("查询用户列表失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @DS("master")
    @Override
    public Result updatePassword(String old_password,String password,long uid){
        try {
            User user=userMapper.getUserById(uid);
            if(user==null){
                return Result.LogicError("用户不存在");
            }
            String pwd=user.getPassword();
            if(!Objects.equals(pwd, old_password)){
                return Result.LogicError("原密码不正确");
            }
            userMapper.updatePassword(password,uid);
            return Result.Success("修改密码成功");
        }catch (Exception e){
            logger.error("修改密码失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @DS("master")
    @Override
    public Result updateUserInfo(String email,String name,long uid){
        try {
            User user=userMapper.getUserByEmail(email);
            if(user!=null&&user.getId()!=uid){
                return Result.LogicError("邮箱地址已存在");
            }
            user=userMapper.getUserByName(name);
            if (user!=null&&user.getId()!=uid){
                return Result.LogicError("用户名已存在");
            }
            userMapper.updateUserInfo(email,name,uid);
            return Result.Success("修改个人信息成功");
        }catch (Exception e){
            logger.error("修改个人信息失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
}
