package com.example.vnollxonlinejudge.service;
import com.example.vnollxonlinejudge.common.result.Result;
public interface JudgeService {

    String judgeSubmit(String code, String option, long pid, long uid, long cid, String create_time, String uname, int time, int memory);
}
