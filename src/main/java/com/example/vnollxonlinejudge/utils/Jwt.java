package com.example.vnollxonlinejudge.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import java.util.Date;

public class Jwt {
    // 注意：密钥长度必须至少256位（32字节）以符合HS256安全要求
    private static final String SECRET_KEY_STRING = "vnollxvnollxvnollxvnollxvnollx12"; // 加长密钥
    private static final SecretKey SECRET_KEY = Keys.hmacShaKeyFor(SECRET_KEY_STRING.getBytes());
    private static final long EXPIRE_TIME = 86400000; // Token 过期时间（1天，单位：毫秒）

    // 生成 Token
    public static String generateToken(String userId) {
        Date now = new Date();
        Date expireDate = new Date(now.getTime() + EXPIRE_TIME);

        return Jwts.builder()
                .subject(userId) // 新API使用subject()替代setSubject()
                .issuedAt(now)   // 新API使用issuedAt()替代setIssuedAt()
                .expiration(expireDate) // 新API使用expiration()替代setExpiration()
                .signWith(SECRET_KEY) // 直接传入SecretKey对象，不再指定算法
                .compact();
    }

    // 解析 Token 并获取用户 ID
    public static String getUserIdFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(SECRET_KEY) // 新API使用verifyWith()替代setSigningKey()
                    .build()
                    .parseSignedClaims(token) // 新API使用parseSignedClaims()替代parseClaimsJws()
                    .getPayload();

            return claims.getSubject();
        } catch (JwtException e) {
            return null; // 解析失败返回 null
        }
    }

    // 验证 Token 有效性
    public static boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(SECRET_KEY)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false; // 无效 Token
        }
    }
}