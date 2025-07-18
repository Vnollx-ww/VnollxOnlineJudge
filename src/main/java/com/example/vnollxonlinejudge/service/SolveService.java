package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.domain.Solve;

import java.util.List;

public interface SolveService {
    void createSolve(String content,String name,long pid,long uid,String title,String pname);
    Solve getSolve(long id);
    List<Solve> getAllSolves(long pid);
}
