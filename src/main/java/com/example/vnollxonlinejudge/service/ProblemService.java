package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemVo;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProblemService {
    void createProblem(String title, String description, int timeLimit, int memoryLimit, String difficulty, String inputFormat, String outputFormat, String inputExample, String outputExample, String hint, String open, MultipartFile testCaseFile, List<String> tags);

    void deleteProblemByAdmin(Long id);
    void updateProblem(Long id, String title, String description, int timeLimit, int memoryLimit, String difficulty, String inputFormat, String outputFormat, String inputExample, String outputExample, String hint,String open, MultipartFile testCaseFile, List<String> tags);

    ProblemVo getProblemInfo(Long pid, Long cid);

    List<String> getTagNames(Long pid);
    List<ProblemVo> getProblemList(String name, Long pid, int offset, int size, boolean ok);

    Long getCount(String keyword, Long pid,boolean ok);
    boolean judgeIsSolve(Long pid,Long uid,Long cid);
    void updatePassCount(Long pid, int ok);
    void addUserSolveRecord(Long pid,Long uid,Long cid);
}
