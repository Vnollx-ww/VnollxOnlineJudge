package com.example.vnollxonlinejudge.service;

import org.springframework.data.redis.core.ZSetOperations;

import java.util.*;


public interface RedisService {
    void cacheSubmission(String userName, String title, String code,
                         String result, String createTime, String language,
                         Long uid, Long pid, Long time, Long memory,Long cid);
    void setKey(String key,String value,Long seconds);
    String getValueByKey(String key);
    Boolean checkKeyValue(String key,String value);
    boolean addToSetByKey(String key,Long score,String userName,Long seconds);
    void updateIfPass(String userPassKey,String userPenaltyKey,String problemPassKey,String problemSubmitKey,String rankingKey,String userName,Long penalty);
    void updateIfNoPass(String userPenaltyKey,String problemSubmitKey,String userPassKey, String rankingKey,String userName);
    Long getTtl(String key);
    Set<ZSetOperations.TypedTuple<String>> getZset(String key);
    boolean IsExists(String key);
    boolean tryLock(String lockKey,int expireTime);
    void deleteKey(String key);
}
