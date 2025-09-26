package com.example.vnollxonlinejudge.service;

import java.util.List;

public interface TestCaseCacheService {
    List<String[]> getTestCases(String zipFilePath);
}
