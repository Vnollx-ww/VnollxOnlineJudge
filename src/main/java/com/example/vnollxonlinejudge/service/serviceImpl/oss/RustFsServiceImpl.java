package com.example.vnollxonlinejudge.service.serviceImpl.oss;

import com.example.vnollxonlinejudge.service.OssService;
import org.springframework.web.multipart.MultipartFile;

public class RustFsServiceImpl implements OssService {
    @Override
    public void uploadFile(String fileUrl, MultipartFile testCaseFile) {

    }

    @Override
    public void deleteFile(String fileUrl) {

    }

    @Override
    public String uploadAvatar(MultipartFile avatar,Long uid) {
        return null;
    }
}
