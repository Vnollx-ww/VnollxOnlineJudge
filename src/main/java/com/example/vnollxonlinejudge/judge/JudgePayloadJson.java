package com.example.vnollxonlinejudge.judge;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * 将字符串安全嵌入手写 JSON 的字符串值内（去掉 Jackson 生成的外层引号）。
 */
public final class JudgePayloadJson {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JudgePayloadJson() {
    }

    public static String escapeString(String str) {
        if (str == null) {
            return "";
        }
        try {
            String quoted = MAPPER.writeValueAsString(str);
            return quoted.substring(1, quoted.length() - 1);
        } catch (JsonProcessingException e) {
            return "";
        }
    }
}
