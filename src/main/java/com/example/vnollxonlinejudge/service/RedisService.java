package com.example.vnollxonlinejudge.service;

import redis.clients.jedis.resps.Tuple;

import java.util.*;


public interface RedisService {
    void cacheSubmission(String userName, String title, String code,
                         String result, String createTime, String language,
                         Long uid, Long pid, Long time, Long memory,Long cid);
    void setKey(String key,String value,Long seconds);
    String getValueByKey(String key);
    boolean addToSetByKey(String key,Long score,String userName,Long seconds);
    void updateIfPass(String userPassKey,String userPenaltyKey,String problemPassKey,String problemSubmitKey,String rankingKey,String userName,Long penalty);
    void updateIfNoPass(String userPenaltyKey,String problemSubmitKey,String userPassKey, String rankingKey,String userName);
    Long getTtl(String key);
    List<Tuple> getZset(String key);
    boolean IsExists(String key);
    boolean tryLock(String lockKey,int expireTime);
    void deleteKey(String key);
}
