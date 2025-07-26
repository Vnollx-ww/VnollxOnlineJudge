package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.entity.ProblemTag;
import com.example.vnollxonlinejudge.mapper.ProblemTagMapper;
import com.example.vnollxonlinejudge.service.ProblemTagService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
@Service
public class ProblemTagServiceImpl extends ServiceImpl<ProblemTagMapper, ProblemTag> implements ProblemTagService {
    @Override
    public List<String> getTagNames(long pid) {
        QueryWrapper<ProblemTag> wrapper = new QueryWrapper<>();
        wrapper.eq("problem_id", pid).select("tag_name");
        List<ProblemTag> problemTags = this.baseMapper.selectList(wrapper);

        // 将 ProblemTag 列表转换为 String 列表
        return problemTags.stream()
                .map(ProblemTag::getTagName)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteRelated(String name) {
        QueryWrapper<ProblemTag> wrapper=new QueryWrapper<>();
        wrapper.eq("tag_name",name);
        this.baseMapper.delete(wrapper);
    }

    @Override
    public void deleteTagByProblem(long pid) {
        QueryWrapper<ProblemTag> wrapper=new QueryWrapper<>();
        wrapper.eq("problem_id",pid);
        this.baseMapper.delete(wrapper);
    }

    @Override
    public void addRelated(String name, long pid) {
        ProblemTag problemTag=new ProblemTag();
        problemTag.setProblemId(pid);
        problemTag.setTagName(name);
        this.save(problemTag);
    }
}
