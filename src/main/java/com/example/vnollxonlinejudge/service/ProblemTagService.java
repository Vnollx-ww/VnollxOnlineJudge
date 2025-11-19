package com.example.vnollxonlinejudge.service;

import java.util.List;

public interface ProblemTagService {
    List<String> getTagNames(Long pid);
    void deleteRelated(String name);
    void deleteTagByProblem(Long pid);
    void addRelated(String name,Long pid);
    void addRelatedTags(List<String> names,Long pid);
    List<Long> getProblemByTag(String name);
}
