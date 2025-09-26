package com.example.vnollxonlinejudge.model.base;

public enum RedisKeyType {
    REGISTER(":register"),
    FORGET(":forget"), 
    UPDATE(":update"),
    LOGOUT(":logout");
    
    private final String suffix;
    
    RedisKeyType(String suffix) {
        this.suffix = suffix;
    }
    
    public String generateKey(String identifier) {
        return identifier + suffix;
    }
    
    public String generateKey(Long identifier) {
        return identifier + suffix;
    }
}