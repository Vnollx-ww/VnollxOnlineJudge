package com.example.vnollxonlinejudge.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface OssService {
    void uploadFile(String fileUrl, MultipartFile testCaseFile)throws IOException ;
    void deleteFile(String fileUrl) throws IOException;
}
