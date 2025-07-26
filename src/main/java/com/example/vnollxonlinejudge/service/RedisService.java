package com.example.vnollxonlinejudge.service;

import redis.clients.jedis.resps.Tuple;

import java.util.*;


public interface RedisService {
    void cacheSubmission(String userName, String title, String code,
                         String result, String createTime, String language,
                         long uid, long pid, int time, long cid);
    void setkey(String key,String value,long seconds);
    String getValueByKey(String key);
    boolean addToSetByKey(String key,long score,String userName,long seconds);
    void updateIfPass(String userPassKey,String userPenaltyKey,String problemPassKey,String problemSubmitKey,String rankingKey,String userName);
    void updateIfNoPass(String userPenaltyKey,String problemSubmitKey,String userPassKey, String rankingKey,String userName);
    long getTtl(String key);
    List<Tuple> getZset(String key);
    boolean IsExists(String key);
    boolean tryLock(String lockKey,int expireTime);
    void deleteKey(String key);
}
