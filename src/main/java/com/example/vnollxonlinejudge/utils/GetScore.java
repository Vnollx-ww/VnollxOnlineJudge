package com.example.vnollxonlinejudge.utils;

public class GetScore {
    public static Long calculateScore(int passCount, int penaltyTime) {
        return ((long) (-passCount) << 32) | (penaltyTime & 0xFFFFFFFFL);
    }
}
