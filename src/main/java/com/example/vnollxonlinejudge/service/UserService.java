package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.domain.User;
import com.example.vnollxonlinejudge.domain.UserSolvedProblem;

import java.util.List;

public interface UserService {
    String login(String email, String password);
    void register(String name,String password,String email);
    User getUserById(long id);
    List<UserSolvedProblem> getSolveProblem(long uid);
    List<User> getAllUser();
    void updatePassword(String old_password,String password,long uid);
    void updateUserInfo(String email,String name,long uid);
    void updateSubmitCount(long uid,int ok);
}
