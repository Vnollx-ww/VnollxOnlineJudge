package com.example.vnollxonlinejudge.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import java.util.Date;

public class JwtToken {
    private static final String SECRET_KEY_STRING = "vnollxvnollxvnollxvnollxvnollx12"; // 加长密钥
    private static final SecretKey SECRET_KEY = Keys.hmacShaKeyFor(SECRET_KEY_STRING.getBytes());
    private static final Long EXPIRE_TIME = 86400000L; // Token 过期时间（1天，单位：毫秒）
    private static final String USER_ID_CLAIM = "uid";
    private static final String USER_IDENTITY_CLAIM = "identity";
    // 生成 Token
    public static String generateToken(String userId,String identity) {
        Date now = new Date();
        Date expireDate = new Date(now.getTime() + EXPIRE_TIME);

        return Jwts.builder()
                .subject(userId) // 新API使用subject()替代setSubject()
                .claim(USER_ID_CLAIM, userId) // 将用户ID放入claims
                .claim(USER_IDENTITY_CLAIM, identity) // 将身份信息放入claims
                .issuedAt(now)   // 新API使用issuedAt()替代setIssuedAt()
                .expiration(expireDate) // 新API使用expiration()替代setExpiration()
                .signWith(SECRET_KEY) // 直接传入SecretKey对象，不再指定算法
                .compact();
    }

    // 解析 Token 并获取用户 ID
    // 从Token中获取用户ID
    public static String getUserIdFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(SECRET_KEY)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            // 优先从自定义claim获取，如果没有则从subject获取
            return claims.get(USER_ID_CLAIM, String.class);
        } catch (JwtException e) {
            return null;
        }
    }

    // 从Token中获取用户身份
    public static String getUserIdentityFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(SECRET_KEY)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            return claims.get(USER_IDENTITY_CLAIM, String.class);
        } catch (JwtException e) {
            return null;
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