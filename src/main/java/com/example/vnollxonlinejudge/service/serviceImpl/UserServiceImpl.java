package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;

import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.UserMapper;
import com.example.vnollxonlinejudge.service.RedisService;
import com.example.vnollxonlinejudge.service.UserSolvedProblemService;
import com.example.vnollxonlinejudge.utils.JwtToken;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.example.vnollxonlinejudge.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import static com.example.vnollxonlinejudge.utils.BCryptSalt.generateSalt;
import static com.example.vnollxonlinejudge.utils.BCryptSalt.hashPasswordWithSalt;

@Service
@Setter
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired private UserSolvedProblemService userSolvedProblemService;
    @Autowired private RedisService redisService;
    //@DS("master")
    @Override
    public String login(String email, String password) {
        User user = lambdaQuery().eq(User::getEmail, email).one();
        if(user == null) {
            throw new BusinessException("用户不存在");
        }
        if (!Objects.equals(hashPasswordWithSalt(password, user.getSalt()), user.getPassword())) {
            throw new BusinessException("密码错误，请重试");
        }
        return JwtToken.generateToken(String.valueOf(user.getId()),user.getIdentity());
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
        String salt=generateSalt();
        User user = new User(name,hashPasswordWithSalt(password,salt),email);
        user.setSalt(salt);
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
        user.setPassword(hashPasswordWithSalt(newPassword,user.getSalt()));
        this.updateById(user);
        redisService.deleteKey(key);
    }

    // @DS("slave")
    @Override
    public UserVo getUserById(Long id) {
        User user = getById(id);
        if(user == null) {
            throw new BusinessException("用户不存在");
        }
        user.setPassword("无权限查看");
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
                .map(UserVo::new)  // 或者 user -> new UserResponse(user)
                .collect(Collectors.toList());
    }

    //@DS("master")
    @Override
    public void updatePassword(String old_password, String password, Long uid) {
        User user = getById(uid);
        if(user == null) {
            throw new BusinessException("用户不存在");
        }
        if(!Objects.equals(user.getPassword(), hashPasswordWithSalt(old_password, user.getSalt()))) {
            throw new BusinessException("原密码不正确");
        }
        user.setPassword(hashPasswordWithSalt(password,user.getSalt()));
        updateById(user);
    }

    //@DS("master")
    @Override
    public void updateUserInfo(
            String email, String name, String signature,Long uid,
            String option,String verifyCode
    ) {
        String key=email+":update";
        if(option.equals("email")) {
            if (!redisService.IsExists(key) || !Objects.equals(redisService.getValueByKey(key), verifyCode)) {
                throw new BusinessException("验证码错误");
            }
        }
        if (lambdaQuery().eq(User::getName, name).ne(User::getId, uid).exists()) {
            throw new BusinessException("用户名已存在");
        }
        User user=new User();
        user.setId(uid);
        user.setEmail(email);
        user.setName(name);
        user.setSignature(signature);
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
        if (currentIdentity.equals("SUPER_ADMIN")){
            if (user.getIdentity().equals("SUPER_ADMIN"))throw new BusinessException("无权限");
        }else if (currentIdentity.equals("ADMIN")){
            if (!user.getIdentity().equals("USER"))throw new BusinessException("无权限");
        }
        this.baseMapper.deleteById(user);
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
    public void updateUserInfoByAdmin(
            String email, String name,
            String identity, Long uid,String currentIdentity
    ) {
        User user=this.getById(uid);
        if (currentIdentity.equals("SUPER_ADMIN")){
            if (user.getIdentity().equals("SUPER_ADMIN"))throw new BusinessException("无权限");
        }else if (currentIdentity.equals("ADMIN")){
            if (!user.getIdentity().equals("USER"))throw new BusinessException("无权限");
        }
        if (lambdaQuery().eq(User::getEmail, email).ne(User::getId, uid).exists()) {
            throw new BusinessException("邮箱地址已存在");
        }
        if (lambdaQuery().eq(User::getName, name).ne(User::getId, uid).exists()) {
            throw new BusinessException("用户名已存在");
        }
        user.setId(uid);
        user.setEmail(email);
        user.setName(name);
        user.setIdentity(identity);
        updateById(user);
        String key="logout:"+uid;
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
        if ("ADMIN".equals(identity)) {
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
    public Long getCount() {
        return this.count();
    }

    @Override
    public List<UserVo> getAllUser() {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.select("id", "name", "submit_count", "pass_count");

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
}