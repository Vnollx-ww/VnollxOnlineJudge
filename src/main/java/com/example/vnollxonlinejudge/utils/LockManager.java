package com.example.vnollxonlinejudge.utils;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class LockManager {
    private final ConcurrentHashMap<Long, Object> locks = new ConcurrentHashMap<>();

    public Object getLock(Long problemId) {
        // 计算问题ID的哈希值，避免锁对象过多
        long bucket = problemId % 100; // 假设有100个桶
        return locks.computeIfAbsent(bucket, k -> new Object());
    }
}