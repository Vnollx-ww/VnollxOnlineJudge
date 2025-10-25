package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveProblemDTO;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemBasicVo;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProblemService {
    void createProblem(AdminSaveProblemDTO dto);

    void deleteProblemByAdmin(Long id);
    void updateProblem(AdminSaveProblemDTO dto);

    ProblemVo getProblemInfo(Long pid, Long cid,String name);

    List<String> getTagNames(Long pid);
    List<ProblemVo> getProblemList(String name, Long pid, int offset, int size, boolean ok);

    Long getCount(String keyword, Long pid,boolean ok);
    boolean isSolved(Long pid,Long uid,Long cid);
    void updatePassCount(Long pid, int ok);
    void addUserSolveRecord(Long pid,Long uid,Long cid,String problemName);

    List<Long> getAllProblemId();
    
    List<ProblemBasicVo> getAllProblemBasicInfo();
}
