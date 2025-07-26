package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.model.dto.response.solve.SolveResponse;
import com.example.vnollxonlinejudge.model.entity.Solve;

import java.util.List;

public interface SolveService {
    void createSolve(String content,String name,long pid,long uid,String title,String problemName);
    SolveResponse getSolve(long id);
    List<SolveResponse> getAllSolves(long pid);
}
