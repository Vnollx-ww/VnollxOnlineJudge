package com.example.vnollxonlinejudge.service;

import java.util.List;

public interface TestCaseCacheService {
    /**
     * @param requireOutput true：每个测试点须同时存在 i.in 与 i.out（标准评测）。
     *                      false：仅需 i.in，i.out 可有可无；缺失时第二段为空串（构造题）。
     */
    List<String[]> getTestCases(String zipFilePath, boolean requireOutput);

    default List<String[]> getTestCases(String zipFilePath) {
        return getTestCases(zipFilePath, true);
    }

    /**
     * 清除指定测试用例的缓存
     */
    void evictFromCache(String zipFilePath);
}
