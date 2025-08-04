package com.example.vnollxonlinejudge.utils;

import com.example.vnollxonlinejudge.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;

public class TimeUtils {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    public static long calculateTTL(String endTimeStr) {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            Date endTime = sdf.parse(endTimeStr);
            Date now = new Date();
            long ttl = (endTime.getTime() - now.getTime()) / 1000;
            return ttl > 0 ? ttl : -1;
        } catch (ParseException e) {
            logger.error("解析比赛结束时间失败，使用默认过期时间24小时", e);
            return 24 * 60 * 60; // 默认24小时
        }
    }
    public static long calculateMin(String beginTimeStr,String createTimeStr) {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            Date beginTime = sdf.parse(beginTimeStr);
            Date createTime = sdf.parse(createTimeStr);
            return (createTime.getTime() - beginTime.getTime()) / 60000;
        }catch (ParseException e) {
            logger.error("解析比赛结束时间失败，使用默认过期时间24小时", e);
            return 24 * 60 * 60; // 默认24小时
        }

    }
}
