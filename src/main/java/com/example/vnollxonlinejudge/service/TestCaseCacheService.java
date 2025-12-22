package com.example.vnollxonlinejudge.service;

import java.util.List;

public interface TestCaseCacheService {
    List<String[]> getTestCases(String zipFilePath);
    
    /**
     * 清除指定测试用例的缓存
     */
    void evictFromCache(String zipFilePath);
}
