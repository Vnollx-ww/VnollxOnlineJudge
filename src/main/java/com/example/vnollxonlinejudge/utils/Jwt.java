package com.example.vnollxonlinejudge.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

import java.util.Date;
public class Jwt {
    private static final String SECRET_KEY = "vnollxvnollx"; // 密钥，建议从配置文件读取
    private static final long EXPIRE_TIME = 86400000; // Token 过期时间（1天，单位：毫秒）

    // 生成 Token
    public static String generateToken(String userId) {
        Date now = new Date();
        Date expireDate = new Date(now.getTime() + EXPIRE_TIME);
        return Jwts.builder()
                .setSubject(userId) // 存储用户标识（如用户 ID）
                .setIssuedAt(now)
                .setExpiration(expireDate)
                .signWith(SignatureAlgorithm.HS256, SECRET_KEY) // 使用 HS256 签名算法
                .compact();
    }
    // 解析 Token 并获取用户 ID
    public static String getUserIdFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .setSigningKey(SECRET_KEY)
                    .parseClaimsJws(token)
                    .getBody();
            return claims.getSubject();
        } catch (JwtException e) {
            return null; // 解析失败返回 null
        }
    }
    // 验证 Token 有效性
    public static boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(SECRET_KEY).parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false; // 无效 Token
        }
    }
}