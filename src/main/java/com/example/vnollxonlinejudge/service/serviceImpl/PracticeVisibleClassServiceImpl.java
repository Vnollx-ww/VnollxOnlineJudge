package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.mapper.PracticeVisibleClassMapper;
import com.example.vnollxonlinejudge.model.entity.PracticeVisibleClass;
import com.example.vnollxonlinejudge.service.PracticeVisibleClassService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PracticeVisibleClassServiceImpl extends ServiceImpl<PracticeVisibleClassMapper, PracticeVisibleClass> implements PracticeVisibleClassService {

    @Override
    public Set<Long> getVisibleClassIds(Long practiceId) {
        return lambdaQuery()
                .eq(PracticeVisibleClass::getPracticeId, practiceId)
                .list()
                .stream()
                .map(PracticeVisibleClass::getClassId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @Override
    @Transactional
    public void replaceVisibleClasses(Long practiceId, List<Long> classIds) {
        deleteByPracticeId(practiceId);
        if (classIds == null || classIds.isEmpty()) {
            return;
        }
        List<PracticeVisibleClass> relations = classIds.stream()
                .distinct()
                .map(classId -> PracticeVisibleClass.builder()
                        .practiceId(practiceId)
                        .classId(classId)
                        .build())
                .toList();
        this.saveBatch(relations);
    }

    @Override
    public void deleteByPracticeId(Long practiceId) {
        QueryWrapper<PracticeVisibleClass> wrapper = new QueryWrapper<>();
        wrapper.eq("practice_id", practiceId);
        this.baseMapper.delete(wrapper);
    }

    @Override
    public void deleteByClassId(Long classId) {
        QueryWrapper<PracticeVisibleClass> wrapper = new QueryWrapper<>();
        wrapper.eq("class_id", classId);
        this.baseMapper.delete(wrapper);
    }
}
