package com.example.vnollxonlinejudge.utils;

import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.example.vnollxonlinejudge.controller.ProblemController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

public class UrlDecodedUtil {
    private static final Logger logger = LoggerFactory.getLogger(UrlDecodedUtil.class);
    public static String decodedUrl(String code){
        String decodedName = code;
        if (StringUtils.isNotBlank(code)) {
            try {
                decodedName = URLDecoder.decode(code, StandardCharsets.UTF_8);
            } catch (Exception e) {
                logger.error("URL解码失败: " + e.getMessage());
            }
        }
        return decodedName;
    }
}
