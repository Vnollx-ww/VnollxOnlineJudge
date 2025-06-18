package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.utils.Result;

public interface SolveService {
    Result createSolve(String content,String name,long pid,long uid,String title,String pname);
    Result getSolve(long id);
    Result getAllSolves(long pid);
}
