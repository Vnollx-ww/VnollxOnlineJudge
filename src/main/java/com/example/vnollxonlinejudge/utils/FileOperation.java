package com.example.vnollxonlinejudge.utils;

import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.util.Base64;

public class FileOperation {
    private static final String ALGORITHM = "AES";
    private static final String SECRET_KEY = "vnollxvnollxvnollxvnollx"; //
    private static final String TRANSFORMATION = "AES/ECB/PKCS5Padding";

    /**
     * 加密文件名
     */
    public static String encryptFileName(String fileName) {
        try {
            SecretKeySpec secretKey = new SecretKeySpec(SECRET_KEY.getBytes(), ALGORITHM);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);

            byte[] encryptedBytes = cipher.doFinal(fileName.getBytes());
            return Base64.getUrlEncoder().withoutPadding().encodeToString(encryptedBytes);
        } catch (Exception e) {
            throw new RuntimeException("文件名加密失败", e);
        }
    }

    /**
     * 解密文件名
     */
    public static String decryptFileName(String encryptedFileName) {
        try {
            SecretKeySpec secretKey = new SecretKeySpec(SECRET_KEY.getBytes(), ALGORITHM);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, secretKey);

            byte[] decodedBytes = Base64.getUrlDecoder().decode(encryptedFileName);
            byte[] decryptedBytes = cipher.doFinal(decodedBytes);
            return new String(decryptedBytes);
        } catch (Exception e) {
            throw new RuntimeException("文件名解密失败", e);
        }
    }

    public static String getFileExtension(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return "";
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            return "";
        }

        int lastDotIndex = originalFilename.lastIndexOf(".");
        if (lastDotIndex == -1 || lastDotIndex == originalFilename.length() - 1) {
            return ""; // 没有后缀或者点号在最后
        }

        return originalFilename.substring(lastDotIndex + 1).toLowerCase();
    }
    private static String getContentTypeFromFileName(String fileName) {
        if (fileName == null) {
            return "application/octet-stream";
        }

        if (fileName.endsWith(".png")) return "image/png";
        if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg";
        if (fileName.endsWith(".gif")) return "image/gif";
        if (fileName.endsWith(".pdf")) return "application/pdf";
        if (fileName.endsWith(".txt")) return "text/plain";
        if (fileName.endsWith(".html")) return "text/html";
        if (fileName.endsWith(".xml")) return "application/xml";
        if (fileName.endsWith(".json")) return "application/json";

        return "application/octet-stream";
    }
    public static String multipartFileToBase64(MultipartFile multipartFile) {
        if (multipartFile == null || multipartFile.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }
        try {
            byte[] fileBytes = multipartFile.getBytes();
            return Base64.getEncoder().encodeToString(fileBytes);
        }catch (IOException e){
            throw new RuntimeException(e);
        }
    }
}