package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.model.dto.response.problem.ProblemResponse;
import com.example.vnollxonlinejudge.model.entity.Problem;
import com.example.vnollxonlinejudge.model.entity.Tag;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProblemService {
    void createProblem(String title, String description, int timeLimit, int memoryLimit, String difficulty, String inputFormat, String outputFormat, String inputExample, String outputExample, String hint, String open, MultipartFile testCaseFile, List<String> tags);

    void deleteProblemByAdmin(long id);
    void updateProblem(long id, String title, String description, int timeLimit, int memoryLimit, String difficulty, String inputFormat, String outputFormat, String inputExample, String outputExample, String hint,String open, MultipartFile testCaseFile, List<String> tags);

    ProblemResponse getProblemInfo(long pid, long cid);

    List<String> getTagNames(long pid);
    List<ProblemResponse> getProblemList(String name, long pid, int offset, int size,boolean ok);

    Long getCount(String keyword, long pid,boolean ok);
    boolean judgeIsSolve(long pid,long uid,long cid);
    void updatePassCount(long pid, int ok);
    void addUserSolveRecord(long pid,long uid,long cid);
}
