package com.example.vnollxonlinejudge.service.serviceImpl.oss;

import com.example.vnollxonlinejudge.service.OssService;
import com.example.vnollxonlinejudge.service.serviceImpl.ProblemServiceImpl;
import io.minio.*;
import io.minio.errors.ErrorResponseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
@Primary
public class MinioServiceImpl implements OssService {
    private static final Logger logger = LoggerFactory.getLogger(MinioServiceImpl.class);
    @Autowired
    private MinioClient minioClient;
    private final String bucket="problem";
    @Override
    public void uploadFile(String fileUrl,MultipartFile testCaseFile) throws IOException {
        try {
            // MinIO的putObject会自动覆盖同名文件，无需手动检查删除
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(fileUrl)
                    .stream(testCaseFile.getInputStream(), testCaseFile.getSize(), -1)
                    .contentType(testCaseFile.getContentType())
                    .build());
        } catch (Exception e) {
            logger.error("文件上传失败: "+e.getMessage());
            throw new IOException("文件上传失败: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteFile(String fileUrl) throws IOException {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(fileUrl)
                    .build());
        } catch (ErrorResponseException e) {
            if (!"NoSuchKey".equals(e.errorResponse().code())) {
                logger.error("文件删除失败: "+e.getMessage());
                throw new IOException("文件删除失败: " + e.getMessage(), e);
            }
            // 文件不存在可忽略（根据业务需求也可抛出FileNotFoundException）
        } catch (Exception e) {
            logger.error("文件删除异常: "+e.getMessage());
            throw new IOException("文件删除异常: " + e.getMessage(), e);
        }
    }
}
