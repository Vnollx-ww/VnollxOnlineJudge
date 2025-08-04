package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.response.user.UserResponse;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.entity.UserSolvedProblem;

import java.util.List;

public interface UserService {
    String login(String email, String password);
    void register(String name,String password,String email,String verifyCode);
    void forgetPassword(String newPassword,String email,String verifyCode);
    UserResponse getUserById(long id);
    User getUserByEmail(String email);
    List<UserSolvedProblem> getSolveProblem(long uid);
    List<UserResponse> getAllUserByAdmin(int pageNum,int pageSize,String keyword,long uid);
    void updatePassword(String old_password,String password,long uid);
    void updateUserInfo(String email,String name,long uid,String option,String verifyCode);
    void updateSubmitCount(long uid,int ok);
    //!!! ADMIN
    void deleteUserByAdmin(long id);
    void addUserByAdmin(String name,String email,String identity);
    void updateUserInfoByAdmin(String email,String name,String identity,long uid);
    long getCountByAdmin(String keyword,String identity);
    long getCount();
    List<UserResponse> getAllUser();
}
