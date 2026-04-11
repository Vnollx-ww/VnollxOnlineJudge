package com.example.vnollxonlinejudge.service;

import java.util.List;
import java.util.Set;

public interface PracticeVisibleClassService {
    Set<Long> getVisibleClassIds(Long practiceId);
    void replaceVisibleClasses(Long practiceId, List<Long> classIds);
    void deleteByPracticeId(Long practiceId);
    void deleteByClassId(Long classId);
}
