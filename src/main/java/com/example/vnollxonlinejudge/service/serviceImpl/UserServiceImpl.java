package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;

import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.base.RedisKeyType;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.UserMapper;
import com.example.vnollxonlinejudge.service.OssService;
import com.example.vnollxonlinejudge.service.RedisService;
import com.example.vnollxonlinejudge.service.UserSolvedProblemService;
import com.example.vnollxonlinejudge.utils.JwtToken;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.example.vnollxonlinejudge.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import static com.example.vnollxonlinejudge.utils.BCryptSalt.generateSalt;
import static com.example.vnollxonlinejudge.utils.BCryptSalt.hashPasswordWithSalt;

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    // 常量定义
    private static final String IDENTITY_SUPER_ADMIN = "SUPER_ADMIN";
    private static final String IDENTITY_ADMIN = "ADMIN";
    private static final String IDENTITY_USER = "USER";

    // 错误消息常量
    private static final String ERROR_USER_NOT_EXIST = "用户不存在";
    private static final String ERROR_PASSWORD_WRONG = "密码错误，请重试";
    private static final String ERROR_VERIFY_CODE = "验证码错误";
    private static final String ERROR_EMAIL_EXISTS = "邮箱已存在";
    private static final String ERROR_NAME_EXISTS = "用户名已存在";
    private static final String ERROR_ORIGIN_PASSWORD_WRONG = "原密码不正确";
    private final UserSolvedProblemService userSolvedProblemService;
    private final RedisService redisService;
    private final OssService ossService;
    @Autowired
    public UserServiceImpl(UserSolvedProblemService userSolvedProblemService,
                           RedisService redisService,
                           OssService ossService) {
        this.userSolvedProblemService = userSolvedProblemService;
        this.redisService = redisService;
        this.ossService = ossService;
    }

    public void validateUserExists(User user) {
        if (user == null) {
            throw new BusinessException(ERROR_USER_NOT_EXIST);
        }
    }


    //@DS("master")
    @Override
    public String login(String email, String password) {
        /*List<User> userList=this.list();
        for (User user:userList){
            System.out.println(JwtToken.generateToken(String.valueOf(user.getId()),user.getIdentity()));
        }*/
        User user = lambdaQuery().eq(User::getEmail, email).one();

        validateUserExists(user);

        if (!Objects.equals(hashPasswordWithSalt(password, user.getSalt()), user.getPassword())) {
            throw new BusinessException(ERROR_PASSWORD_WRONG);
        }
        user.setLastLoginTime(LocalDateTime.now());
        this.updateById(user);
        return JwtToken.generateToken(String.valueOf(user.getId()),user.getIdentity());
    }

    //@DS("master")
    @Override
    @Transactional
    public void register(String name, String password, String email,String verifyCode) {
        String key = RedisKeyType.REGISTER.generateKey(email);

        if (!redisService.IsExists(key)|| !Objects.equals(redisService.getValueByKey(key), verifyCode)){
            throw new BusinessException(ERROR_VERIFY_CODE);
        }
        if (lambdaQuery().eq(User::getEmail, email).exists()) {
            throw new BusinessException(ERROR_EMAIL_EXISTS);
        }
        if (lambdaQuery().eq(User::getName, name).exists()) {
            throw new BusinessException(ERROR_NAME_EXISTS);
        }
        String salt=generateSalt();

        User user = User.builder()
                .name(name)
                .password(hashPasswordWithSalt(password, salt))
                .email(email)
                .salt(salt)
                .build();

        this.save(user);
    }

    @Override
    public void forgetPassword(String newPassword, String email, String verifyCode) {
        String key = RedisKeyType.FORGET.generateKey(email);
        if (!redisService.checkKeyValue(key,verifyCode)){
            throw new BusinessException(ERROR_VERIFY_CODE);
        }

        QueryWrapper<User> wrapper=new QueryWrapper<>();
        wrapper.eq("email",email);
        User user=this.baseMapper.selectOne(wrapper);
        user.setPassword(hashPasswordWithSalt(newPassword,user.getSalt()));
        this.updateById(user);
        redisService.deleteKey(key);
    }

    // @DS("slave")
    @Override
    public UserVo getUserById(Long id) {
        User user = getById(id);

        validateUserExists(user);

        return new UserVo(user);
    }

    @Override
    public User getUserByEmail(String email) {
        QueryWrapper<User> wrapper=new QueryWrapper<>();
        wrapper.eq("email",email);
        return this.baseMapper.selectOne(wrapper);
    }

    //@DS("slave")
    @Override
    public List<UserSolvedProblem> getSolveProblem(Long uid) {
        return userSolvedProblemService.getSolveProblem(uid);
    }

    //@DS("slave")
    @Override
    public List<UserVo> getAllUserByAdmin(int pageNum, int pageSize, String keyword, Long uid) {
        // 一次性获取用户信息，避免多次查询
        String identity= UserContextHolder.getCurrentUserIdentity();

        QueryWrapper<User> queryWrapper = new QueryWrapper<>();

        // 如果是管理员，只查询普通用户
        if (IDENTITY_ADMIN.equals(identity)) {
            queryWrapper.eq("identity", IDENTITY_USER);
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
                .map(UserVo::new)  // 或者 user -> new UserResponse(user)
                .collect(Collectors.toList());
    }

    //@DS("master")
    @Override
    public void updatePassword(String old_password, String password, Long uid) {
        User user = getById(uid);
        validateUserExists(user);

        if(!Objects.equals(user.getPassword(), hashPasswordWithSalt(old_password, user.getSalt()))) {
            throw new BusinessException(ERROR_ORIGIN_PASSWORD_WRONG);
        }
        user.setPassword(hashPasswordWithSalt(password,user.getSalt()));
        updateById(user);
    }

    //@DS("master")
    @Override
    public void updateUserInfo(
            MultipartFile avatar, String email, String name, String signature, Long uid,
            String option, String verifyCode
    ) {
        String key= RedisKeyType.UPDATE.generateKey(email);
        if(option.equals("email")) {
            if (!redisService.checkKeyValue(key,verifyCode)){
                throw new BusinessException(ERROR_VERIFY_CODE);
            }
        }
        if (lambdaQuery().eq(User::getName, name).ne(User::getId, uid).exists()) {
            throw new BusinessException(ERROR_NAME_EXISTS);
        }
        User user=User.builder()
                .id(uid)
                .email(email)
                .name(name)
                .signature(signature)
                .build();
        if (avatar!=null){
            try {
                String fileUrl=ossService.uploadAvatar(avatar,uid);
                user.setAvatar(fileUrl);
            }catch (IOException e){
                throw new BusinessException("上传头像失败，请联系管理员");
            }
        }
        updateById(user);
        redisService.deleteKey(key);
    }
    //@DS("master")
    @Override
    public void updateSubmitCount(Long uid, int ok) {
        LambdaUpdateWrapper<User> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.setSql("submit_count = submit_count + 1") // 原子递增
                .setSql("pass_count = pass_count + " + ok)
                .eq(User::getId, uid);
        update(null, updateWrapper);
    }

    @Override
    public void deleteUserByAdmin(Long id,String currentIdentity) {
        User user=this.getById(id);
        if (currentIdentity.equals(IDENTITY_SUPER_ADMIN)){
            if (user.getIdentity().equals(IDENTITY_SUPER_ADMIN))throw new BusinessException("无权限");
        }else if (currentIdentity.equals(IDENTITY_ADMIN)){
            if (!user.getIdentity().equals(IDENTITY_USER))throw new BusinessException("无权限");
        }
        this.baseMapper.deleteById(user);
    }

    @Override
    public void addUserByAdmin(String name, String email, String identity) {
        if (lambdaQuery().eq(User::getEmail, email).exists()) {
            throw new BusinessException(ERROR_EMAIL_EXISTS);
        }

        if (lambdaQuery().eq(User::getName, name).exists()) {
            throw new BusinessException(ERROR_NAME_EXISTS);
        }

        User user = User.builder()
                .name(name)
                .email(email)
                .identity(identity)
                .submitCount(0)
                .passCount(0)
                .build();

        save(user);
    }

    @Override
    public void updateUserInfoByAdmin(
            String email, String name,
            String identity, Long uid,String currentIdentity
    ) {
        User user=this.getById(uid);
        if (currentIdentity.equals(IDENTITY_SUPER_ADMIN)){
            if (user.getIdentity().equals(IDENTITY_SUPER_ADMIN))throw new BusinessException("无权限");
        }else if (currentIdentity.equals(IDENTITY_ADMIN)){
            if (!user.getIdentity().equals(IDENTITY_USER))throw new BusinessException("无权限");
        }
        if (lambdaQuery().eq(User::getEmail, email).ne(User::getId, uid).exists()) {
            throw new BusinessException(ERROR_EMAIL_EXISTS);
        }
        if (lambdaQuery().eq(User::getName, name).ne(User::getId, uid).exists()) {
            throw new BusinessException(ERROR_NAME_EXISTS);
        }

        user.setId(uid);
        user.setEmail(email);
        user.setName(name);
        user.setIdentity(identity);
        updateById(user);
        String key=RedisKeyType.LOGOUT.generateKey(uid);
        redisService.setKey(key,"",86400L);
    }

    @Override
    public Long getCountByAdmin(String keyword,String identity) {
        if (!StringUtils.isNotBlank(keyword)){
            return this.count();
        }

        if (identity == null) {
            throw new BusinessException("您无权限");
        }

        QueryWrapper<User> wrapper=new QueryWrapper<>();
        // 如果是管理员，只查询普通用户
        if (IDENTITY_ADMIN.equals(identity)) {
            wrapper.eq("identity", IDENTITY_USER);
        }

        if (StringUtils.isNotBlank(keyword)) {
            wrapper.and(wq -> wq.like("name", keyword)
                    .or()
                    .like("email", keyword));
        }
        return this.count(wrapper);
    }

    @Override
    public Long getCount() {
        return this.count();
    }

    @Override
    public List<UserVo> getAllUser() {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.select("id", "name", "submit_count", "pass_count","last_login_time");

        return this.baseMapper.selectList(wrapper)
                .stream()
                .map(UserVo::new)
                .collect(Collectors.toList());
    }

    @Override
    public List<Integer> getUserIdList(Long uid) {
        QueryWrapper<User> queryWrapper=new QueryWrapper<>();
        queryWrapper.select("id").ne("id",uid);
        return this.listObjs(queryWrapper);
    }

    @Override
    public List<User> getUserByName(String name) {
        QueryWrapper<User> queryWrapper=new QueryWrapper<>();
        queryWrapper.like("name",name);
        return this.list(queryWrapper);
    }

    @Override
    public List<User> searchByName(String keyword, int pageNum, int pageSize) {
        Page<User> page = new Page<>(pageNum, pageSize);
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.like("name", keyword)
               .select("id", "name", "avatar", "signature");
        return this.page(page, wrapper).getRecords();
    }

    @Override
    public List<User> getUsersByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }
        return this.baseMapper.selectBatchIds(ids);
    }

    @Override
    public User getUserEntityById(Long id) {
        return this.baseMapper.selectById(id);
    }
}