package com.example.vnollxonlinejudge.utils;

import java.util.Random;

public class CaptchaGenerator {
    public static String generateCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();

        for (int i = 0; i < 6; i++) {
            code.append(random.nextInt(10));
        }

        return code.toString();
    }

}
