package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.admin.ProblemExampleItemDTO;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemExampleVo;

import java.util.List;

public interface ProblemExampleService {
    /** 获取题目公开样例（用户端展示） */
    List<ProblemExampleVo> listByProblemId(Long problemId);

    /** 获取题目全部样例（管理端编辑回显，不区分是否公开） */
    List<ProblemExampleVo> listByProblemIdForAdmin(Long problemId);

    void saveExamples(Long problemId, List<ProblemExampleItemDTO> examples);

    void deleteByProblemId(Long problemId);
}
