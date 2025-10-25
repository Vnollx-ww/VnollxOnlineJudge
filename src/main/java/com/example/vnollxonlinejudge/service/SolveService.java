package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.model.vo.solve.SolveVo;

import java.util.List;

public interface SolveService {
    void createSolve(String content,String name,Long pid,Long uid,String title,String problemName);
    SolveVo getSolve(Long id);
    List<SolveVo> getAllSolves(Long pid);
    
    // 管理员功能
    List<SolveVo> getAllSolvesForAdmin(int page, int size, String keyword, Integer status);
    void createSolveForAdmin(String content, String name, Long pid, String title, String problemName);
    void updateSolve(Long id, String content, String name, Long pid, String title, String problemName);
    void updateSolveStatus(Long id, Integer status);
    void deleteSolve(Long id);
    Long getSolveCount(String keyword, Integer status);
}
