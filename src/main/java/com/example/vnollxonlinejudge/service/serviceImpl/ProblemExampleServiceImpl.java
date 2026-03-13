package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.dto.admin.ProblemExampleItemDTO;
import com.example.vnollxonlinejudge.model.entity.ProblemExample;
import com.example.vnollxonlinejudge.model.vo.problem.ProblemExampleVo;
import com.example.vnollxonlinejudge.mapper.ProblemExampleMapper;
import com.example.vnollxonlinejudge.service.ProblemExampleService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProblemExampleServiceImpl extends ServiceImpl<ProblemExampleMapper, ProblemExample> implements ProblemExampleService {

    @Override
    public List<ProblemExampleVo> listByProblemId(Long problemId) {
        LambdaQueryWrapper<ProblemExample> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ProblemExample::getProblemId, problemId)
                .eq(ProblemExample::getIsPublic, true)
                .orderByAsc(ProblemExample::getSortOrder);
        List<ProblemExample> list = list(wrapper);
        return list.stream()
                .map(pe -> new ProblemExampleVo(pe.getId(), pe.getInput(), pe.getOutput(), pe.getSortOrder()))
                .collect(Collectors.toList());
    }

    @Override
    public List<ProblemExampleVo> listByProblemIdForAdmin(Long problemId) {
        LambdaQueryWrapper<ProblemExample> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ProblemExample::getProblemId, problemId)
                .orderByAsc(ProblemExample::getSortOrder);
        List<ProblemExample> list = list(wrapper);
        return list.stream()
                .map(pe -> new ProblemExampleVo(pe.getId(), pe.getInput(), pe.getOutput(), pe.getSortOrder()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveExamples(Long problemId, List<ProblemExampleItemDTO> examples) {
        if (problemId == null) return;
        remove(new LambdaQueryWrapper<ProblemExample>().eq(ProblemExample::getProblemId, problemId));
        if (examples == null || examples.isEmpty()) return;
        int order = 0;
        for (ProblemExampleItemDTO dto : examples) {
            if (dto == null || (dto.getInput() == null && dto.getOutput() == null)) continue;
            String input = dto.getInput() != null ? dto.getInput().trim() : "";
            String output = dto.getOutput() != null ? dto.getOutput().trim() : "";
            if (input.isEmpty() && output.isEmpty()) continue;
            ProblemExample pe = ProblemExample.builder()
                    .problemId(problemId)
                    .input(input)
                    .output(output)
                    .sortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : order)
                    .isPublic(true)
                    .build();
            save(pe);
            order++;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteByProblemId(Long problemId) {
        remove(new LambdaQueryWrapper<ProblemExample>().eq(ProblemExample::getProblemId, problemId));
    }
}
