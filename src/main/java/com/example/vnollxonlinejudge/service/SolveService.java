package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.model.vo.solve.SolveVo;

import java.util.List;

public interface SolveService {
    void createSolve(String content,String name,Long pid,Long uid,String title,String problemName);
    SolveVo getSolve(Long id);
    void setSolvePass(Long id);
    List<SolveVo> getAllSolves(Long pid);
}
