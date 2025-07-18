package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.dynamic.datasource.annotation.DS;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.domain.User;
import com.example.vnollxonlinejudge.domain.UserSolvedProblem;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.UserMapper;
import com.example.vnollxonlinejudge.mapper.UserSolvedProblemMapper;
import com.example.vnollxonlinejudge.service.UserSolvedProblemService;
import com.example.vnollxonlinejudge.utils.Jwt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.example.vnollxonlinejudge.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Objects;

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserSolvedProblemService userSolvedProblemService;
    @DS("master")
    @Override
    public String login(String email, String password) {
        User user = lambdaQuery().eq(User::getEmail, email).one();
        if(user == null) {
            throw new BusinessException("用户不存在");
        }
        if (!Objects.equals(user.getPassword(), password)) {
            throw new BusinessException("密码错误，请重试");
        }
        return Jwt.generateToken(String.valueOf(user.getId()));
    }

    @DS("master")
    @Override
    public void register(String name, String password, String email) {
        if (lambdaQuery().eq(User::getEmail, email).exists()) {
            throw new BusinessException("邮箱已存在");
        }
        if (lambdaQuery().eq(User::getName, name).exists()) {
            throw new BusinessException("用户名已存在");
        }
        User user = new User(name,password,email);
        save(user);
    }

    @DS("slave")
    @Override
    public User getUserById(long id) {
        User user = getById(id);
        if(user == null) {
            throw new BusinessException("用户不存在");
        }
        user.setPassword("无权限查看");
        return user;
    }

    @DS("slave")
    @Override
    public List<UserSolvedProblem> getSolveProblem(long uid) {
        return userSolvedProblemService.getSolveProblem(uid);
    }

    @DS("slave")
    @Override
    public List<User> getAllUser() {
        return list();
    }

    @DS("master")
    @Override
    public void updatePassword(String old_password, String password, long uid) {
        User user = getById(uid);
        if(user == null) {
            throw new BusinessException("用户不存在");
        }
        if(!Objects.equals(user.getPassword(), old_password)) {
            throw new BusinessException("原密码不正确");
        }
        user.setPassword(password);
        updateById(user);
    }

    @DS("master")
    @Override
    public void updateUserInfo(String email, String name, long uid) {
        if (lambdaQuery().eq(User::getEmail, email).ne(User::getId, uid).exists()) {
            throw new BusinessException("邮箱地址已存在");
        }
        if (lambdaQuery().eq(User::getName, name).ne(User::getId, uid).exists()) {
            throw new BusinessException("用户名已存在");
        }
        User user = new User();
        user.setId(uid);
        user.setEmail(email);
        user.setName(name);
        updateById(user);
    }
    @DS("master")
    @Override
    public void updateSubmitCount(long uid, int ok) {
        LambdaUpdateWrapper<User> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.setSql("submit_count = submit_count + 1") // 原子递增
                .setSql("pass_count = pass_count + " + ok)
                .eq(User::getId, uid);
        update(null, updateWrapper);
    }
}