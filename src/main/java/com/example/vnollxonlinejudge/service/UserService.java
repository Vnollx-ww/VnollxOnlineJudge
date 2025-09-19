package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.vo.user.UserVo;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;

import java.util.List;

public interface UserService {
    String login(String email, String password);
    void register(String name,String password,String email,String verifyCode);
    void forgetPassword(String newPassword,String email,String verifyCode);
    UserVo getUserById(Long id);
    User getUserByEmail(String email);
    List<UserSolvedProblem> getSolveProblem(Long uid);
    List<UserVo> getAllUserByAdmin(int pageNum, int pageSize, String keyword, Long uid);
    void updatePassword(String old_password,String password,Long uid);
    void updateUserInfo(String email,String name, String signature,Long uid,String option,String verifyCode);
    void updateSubmitCount(Long uid,int ok);
    //!!! ADMIN
    void deleteUserByAdmin(Long id,String currentIdentity);
    void addUserByAdmin(String name,String email,String identity);
    void updateUserInfoByAdmin(String email,String name,String identity,Long uid,String currentIdentity);
    Long getCountByAdmin(String keyword,String identity);
    Long getCount();
    List<UserVo> getAllUser();
    List<Integer> getUserIdList();
}
