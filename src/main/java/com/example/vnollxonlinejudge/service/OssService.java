package com.example.vnollxonlinejudge.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface OssService {
    void uploadFile(String fileUrl, MultipartFile testCaseFile)throws IOException ;
    void deleteFile(String fileUrl) throws IOException;
    String uploadAvatar(MultipartFile avatar,Long uid) throws IOException;
    /** 上传图片到 avatar 桶，prefix 如 ai-model，返回可访问 URL */
    String uploadImage(MultipartFile file, String prefix) throws IOException;
}
