package com.example.vnollxonlinejudge.utils;

public class GetScore {
    public static Long calculateScore(Long passCount, Long penaltyTime) {
        return ( (-passCount) << 32) | (penaltyTime & 0xFFFFFFFFL);
    }
}
