package com.example.vnollxonlinejudge.service;
public interface JudgeService {

    String judgeSubmit(
            String code, String option,
            Long pid, Long uid, Long cid,
            String create_time, String uname,
            Long time, Long memory
    );
}
