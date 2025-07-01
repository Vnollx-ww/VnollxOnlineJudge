package com.example.vnollxonlinejudge.service;


import com.example.vnollxonlinejudge.domain.User;
import com.example.vnollxonlinejudge.utils.Result;

public interface UserService {
    Result loginService(String email, String password);
    Result registService(String name,String password,String email);
    Result getUserById(long id);
    Result getSolveProblem(long uid);
    Result getAllUser();
    Result updatePassword(String old_password,String password,long uid);
    Result updateUserInfo(String email,String name,long uid);
    Result updateSubmitCount(long uid,int ok);
}
