package com.example.vnollxonlinejudge.model.base;

public enum RedisKeyType {
    REGISTER(":register"),
    FORGET(":forget"), 
    UPDATE(":update"),
    LOGOUT(":logout"),
    USER_PERMISSIONS("user:permissions:"),
    USER_ROLES("user:roles:"),
    PERMISSION_REFRESH("permission:refresh:");
    
    private final String suffix;
    
    RedisKeyType(String suffix) {
        this.suffix = suffix;
    }
    
    public String getSuffix() {
        return suffix;
    }
    
    public String generateKey(String identifier) {
        return identifier + suffix;
    }
    
    public String generateKey(Long identifier) {
        return identifier + suffix;
    }
    
    public String generateKeyPrefix(Long identifier) {
        return suffix + identifier;
    }
}