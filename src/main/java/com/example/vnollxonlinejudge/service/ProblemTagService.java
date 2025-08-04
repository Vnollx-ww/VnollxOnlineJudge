package com.example.vnollxonlinejudge.service;

import java.util.List;

public interface ProblemTagService {
    List<String> getTagNames(long pid);
    void deleteRelated(String name);
    void deleteTagByProblem(long pid);
    void addRelated(String name,long pid);
    List<Long> getProblemByTag(String name);
}
