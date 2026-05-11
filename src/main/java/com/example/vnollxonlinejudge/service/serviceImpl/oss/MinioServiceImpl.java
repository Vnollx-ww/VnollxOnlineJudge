package com.example.vnollxonlinejudge.service.serviceImpl.oss;

import com.example.vnollxonlinejudge.config.MinioProperties;
import com.example.vnollxonlinejudge.service.OssService;
import com.example.vnollxonlinejudge.utils.FileOperation;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.errors.ErrorResponseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * MinIO 实现：
 * <ul>
 *   <li>题目相关对象（{problemId}.zip / {problemId}_checker.cpp）—— 双写到所有 MinIO 端点</li>
 *   <li>头像 / 图片 —— 只写主端点（前端使用单一 URL 展示）</li>
 *   <li>所有写入失败必须抛异常，保证多机数据一致</li>
 * </ul>
 */
@Service
@Primary
public class MinioServiceImpl implements OssService {
    private static final Logger logger = LoggerFactory.getLogger(MinioServiceImpl.class);
    private static final String PROBLEM_BUCKET = "problem";
    private static final String AVATAR_BUCKET = "avatar";

    private final List<MinioClient> minioClients;
    private final MinioClient primaryClient;
    private final String primaryEndpoint;
    private final List<MinioProperties.Endpoint> endpoints;

    @Autowired
    public MinioServiceImpl(@Qualifier("minioClients") List<MinioClient> minioClients, MinioProperties properties) {
        if (minioClients == null || minioClients.isEmpty()) {
            throw new IllegalStateException("MinIO 客户端列表为空");
        }
        this.minioClients = minioClients;
        this.primaryClient = minioClients.get(0);
        this.primaryEndpoint = properties.primary().getUrl();
        this.endpoints = properties.getEndpoints();
    }

    @Override
    public void uploadFile(String fileUrl, MultipartFile testCaseFile) throws IOException {
        byte[] bytes = testCaseFile.getBytes();
        String contentType = testCaseFile.getContentType();
        for (int i = 0; i < minioClients.size(); i++) {
            MinioClient client = minioClients.get(i);
            String endpoint = endpoints != null && i < endpoints.size() ? endpoints.get(i).getUrl() : "unknown";
            try {
                client.putObject(PutObjectArgs.builder()
                        .bucket(PROBLEM_BUCKET)
                        .object(fileUrl)
                        .stream(new ByteArrayInputStream(bytes), bytes.length, -1)
                        .contentType(contentType)
                        .build());
                logger.info("文件上传成功 [{}] endpoint={} size={}", fileUrl, endpoint, bytes.length);
            } catch (Exception e) {
                logger.error("文件上传失败 [{}] endpoint={}: {}", fileUrl, endpoint, e.getMessage());
                throw new IOException("文件上传失败: " + e.getMessage(), e);
            }
        }
    }

    @Override
    public void deleteFile(String fileUrl) throws IOException {
        for (MinioClient client : minioClients) {
            try {
                client.removeObject(RemoveObjectArgs.builder()
                        .bucket(PROBLEM_BUCKET)
                        .object(fileUrl)
                        .build());
            } catch (ErrorResponseException e) {
                if (!"NoSuchKey".equals(e.errorResponse().code())) {
                    logger.error("文件删除失败 [{}]: {}", fileUrl, e.getMessage());
                    throw new IOException("文件删除失败: " + e.getMessage(), e);
                }
                // 文件不存在可忽略
            } catch (Exception e) {
                logger.error("文件删除异常 [{}]: {}", fileUrl, e.getMessage());
                throw new IOException("文件删除异常: " + e.getMessage(), e);
            }
        }
    }

    @Override
    public String uploadAvatar(MultipartFile avatar, Long uid) throws IOException {
        try {
            String lastFix = FileOperation.getFileExtension(avatar);
            String fileUrl = FileOperation.encryptFileName(String.valueOf(uid)) + "." + lastFix;
            primaryClient.putObject(PutObjectArgs.builder()
                    .bucket(AVATAR_BUCKET)
                    .object(fileUrl)
                    .stream(avatar.getInputStream(), avatar.getSize(), -1)
                    .contentType(avatar.getContentType())
                    .build());
            return primaryEndpoint + "/" + AVATAR_BUCKET + "/" + fileUrl;
        } catch (Exception e) {
            logger.error("头像上传失败: {}", e.getMessage());
            throw new IOException("头像上传失败: " + e.getMessage(), e);
        }
    }

    @Override
    public String uploadImage(MultipartFile file, String prefix) throws IOException {
        try {
            String ext = FileOperation.getFileExtension(file);
            if (ext == null || ext.isEmpty()) ext = "png";
            String objectKey = prefix + "/" + UUID.randomUUID().toString().replace("-", "") + "." + ext;
            primaryClient.putObject(PutObjectArgs.builder()
                    .bucket(AVATAR_BUCKET)
                    .object(objectKey)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());
            return primaryEndpoint + "/" + AVATAR_BUCKET + "/" + objectKey;
        } catch (Exception e) {
            logger.error("图片上传失败: {}", e.getMessage());
            throw new IOException("图片上传失败: " + e.getMessage(), e);
        }
    }
}
