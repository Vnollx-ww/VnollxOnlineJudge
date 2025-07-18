package com.example.vnollxonlinejudge.service;

import java.util.List;

public interface ProblemTagService {
    List<String> getTagNames(long pid);
}
