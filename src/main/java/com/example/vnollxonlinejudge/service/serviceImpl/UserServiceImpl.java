package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.dynamic.datasource.annotation.DS;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;

import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.dto.response.user.UserResponse;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.UserMapper;
import com.example.vnollxonlinejudge.mapper.UserSolvedProblemMapper;
import com.example.vnollxonlinejudge.service.RedisService;
import com.example.vnollxonlinejudge.service.UserSolvedProblemService;
import com.example.vnollxonlinejudge.utils.Jwt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.example.vnollxonlinejudge.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserSolvedProblemService userSolvedProblemService;
    @Autowired
    private RedisService redisService;
    //@DS("master")
    @Override
    public String login(String email, String password) {
        User user = lambdaQuery().eq(User::getEmail, email).one();
        if(user == null) {
            throw new BusinessException("用户不存在");
        }
        if (!Objects.equals(user.getPassword(), password)) {
            throw new BusinessException("密码错误，请重试");
        }
        return Jwt.generateToken(String.valueOf(user.getId()),user.getIdentity());
    }

    //@DS("master")
    @Override
    public void register(String name, String password, String email,String verifyCode) {
        String key=email+":register";
        if (!redisService.IsExists(key)|| !Objects.equals(redisService.getValueByKey(key), verifyCode)){
            throw new BusinessException("验证码错误");
        }
        if (lambdaQuery().eq(User::getEmail, email).exists()) {
            throw new BusinessException("邮箱已存在");
        }
        if (lambdaQuery().eq(User::getName, name).exists()) {
            throw new BusinessException("用户名已存在");
        }
        User user = new User(name,password,email);
        save(user);
    }

    @Override
    public void forgetPassword(String newPassword, String email, String verifyCode) {
        String key=email+":forget";
        if (!redisService.IsExists(key)|| !Objects.equals(redisService.getValueByKey(key), verifyCode)){
            throw new BusinessException("验证码错误");
        }
        QueryWrapper<User> wrapper=new QueryWrapper<>();
        wrapper.eq("email",email);
        User user=this.baseMapper.selectOne(wrapper);
        user.setPassword(newPassword);
        this.updateById(user);
        redisService.deleteKey(key);
    }

    // @DS("slave")
    @Override
    public UserResponse getUserById(long id) {
        User user = getById(id);
        if(user == null) {
            throw new BusinessException("用户不存在");
        }
        user.setPassword("无权限查看");
        return new UserResponse(user);
    }

    @Override
    public User getUserByEmail(String email) {
        QueryWrapper<User> wrapper=new QueryWrapper<>();
        wrapper.eq("email",email);
        return this.baseMapper.selectOne(wrapper);
    }

    //@DS("slave")
    @Override
    public List<UserSolvedProblem> getSolveProblem(long uid) {
        return userSolvedProblemService.getSolveProblem(uid);
    }

    //@DS("slave")
    @Override
    public List<UserResponse> getAllUserByAdmin(int pageNum, int pageSize, String keyword, long uid) {
        // 一次性获取用户信息，避免多次查询
        QueryWrapper<User> identityWrapper = new QueryWrapper<User>()
                .select("identity")
                .eq("id", uid);
        User currentUser = this.getOne(identityWrapper);

        if (currentUser == null) {
            throw new BusinessException("您无权限");
        }


        QueryWrapper<User> queryWrapper = new QueryWrapper<>();

        // 如果是管理员，只查询普通用户
        if ("ADMIN".equals(currentUser.getIdentity())) {
            queryWrapper.eq("identity", "USER");
        }

        // 关键字查询
        if (StringUtils.isNotBlank(keyword)) {
            queryWrapper.and(wq -> wq.like("name", keyword)
                    .or()
                    .like("email", keyword));
        }

        // 分页查询
        Page<User> page = new Page<>(pageNum, pageSize);
        return this.page(page, queryWrapper)
                .getRecords()
                .stream()
                .map(UserResponse::new)  // 或者 user -> new UserResponse(user)
                .collect(Collectors.toList());
    }

    //@DS("master")
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

    //@DS("master")
    @Override
    public void updateUserInfo(
            String email, String name, long uid,
            String option,String verifyCode
    ) {
        String key=email+":update";
        if (!redisService.IsExists(key)|| !Objects.equals(redisService.getValueByKey(key), verifyCode)){
            throw new BusinessException("验证码错误");
        }
        if (lambdaQuery().eq(User::getName, name).ne(User::getId, uid).exists()) {
            throw new BusinessException("用户名已存在");
        }
        User user = new User();
        user.setId(uid);
        user.setEmail(email);
        user.setName(name);
        updateById(user);
        redisService.deleteKey(key);
    }
    //@DS("master")
    @Override
    public void updateSubmitCount(long uid, int ok) {
        LambdaUpdateWrapper<User> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.setSql("submit_count = submit_count + 1") // 原子递增
                .setSql("pass_count = pass_count + " + ok)
                .eq(User::getId, uid);
        update(null, updateWrapper);
    }

    @Override
    public void deleteUserByAdmin(long id) {
        QueryWrapper<User> wrapper=new QueryWrapper<>();
        wrapper.eq("id",id);
        this.baseMapper.delete(wrapper);
    }

    @Override
    public void addUserByAdmin(String name, String email, String identity) {
        if (lambdaQuery().eq(User::getEmail, email).exists()) {
            throw new BusinessException("邮箱地址已存在");
        }

        if (lambdaQuery().eq(User::getName, name).exists()) {
            throw new BusinessException("用户名已存在");
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setIdentity(identity);
        user.setSubmitCount(0);
        user.setPassCount(0);

        save(user);
    }

    @Override
    public void updateUserInfoByAdmin(String email, String name, String identity, long uid) {
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
        user.setIdentity(identity);
        updateById(user);
    }

    @Override
    public long getCount(String keyword,long uid) {
        if (!StringUtils.isNotBlank(keyword)){
            return this.count();
        }
        QueryWrapper<User> identityWrapper = new QueryWrapper<User>()
                .select("identity")
                .eq("id", uid);
        User currentUser = this.getOne(identityWrapper);

        if (currentUser == null) {
            throw new BusinessException("您无权限");
        }

        QueryWrapper<User> wrapper=new QueryWrapper<>();
        // 如果是管理员，只查询普通用户
        if ("ADMIN".equals(currentUser.getIdentity())) {
            wrapper.eq("identity", "USER");
        }

        if (StringUtils.isNotBlank(keyword)) {
            wrapper.and(wq -> wq.like("name", keyword)
                    .or()
                    .like("email", keyword));
        }
        return this.count(wrapper);
    }

    @Override
    public List<UserResponse> getAllUser() {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.select("id", "name", "submit_count", "pass_count");

        return this.baseMapper.selectList(wrapper)
                .stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }
}