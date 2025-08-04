package com.example.vnollxonlinejudge.utils;

import org.mindrot.jbcrypt.BCrypt;

public class BCryptSalt {

    public static String generateSalt() {

        return BCrypt.gensalt();
    }

    public static String hashPasswordWithSalt(String password, String salt) {
        return BCrypt.hashpw(password, salt);
    }

    public static boolean verifyPassword(String password, String hashedPassword) {
        return BCrypt.checkpw(password, hashedPassword);
    }

}
