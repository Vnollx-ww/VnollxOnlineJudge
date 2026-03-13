package com.example.vnollxonlinejudge.service.serviceImpl.oss;

import com.example.vnollxonlinejudge.service.OssService;
import com.example.vnollxonlinejudge.utils.FileOperation;
import io.minio.*;
import io.minio.errors.*;
import jakarta.annotation.PostConstruct;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.UUID;

@Service
@Primary
public class MinioServiceImpl implements OssService {
    private static final String endpoint="http://111.230.105.54:9000";
    private static final Logger logger = LoggerFactory.getLogger(MinioServiceImpl.class);
    @Autowired
    public MinioServiceImpl(MinioClient minioClient){
        this.minioClient=minioClient;
    }
    private final MinioClient minioClient;
    private final String bucket="problem";
    @Override
    public void uploadFile(String fileUrl,MultipartFile testCaseFile) throws IOException {
        try {
            // MinIO 的 putObject 会自动覆盖同名文件，无需手动检查删除
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

    @Override
    public String uploadAvatar(MultipartFile avatar,Long uid) throws IOException {
        try {
            String lastFix=FileOperation.getFileExtension(avatar);
            String fileUrl= FileOperation.encryptFileName(String.valueOf(uid))+"."+lastFix;
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket("avatar")
                    .object(fileUrl)
                    .stream(avatar.getInputStream(), avatar.getSize(), -1)
                    .contentType(avatar.getContentType())
                    .build());
            return generateAvatarUrl(fileUrl);
        } catch (Exception e) {
            logger.error("头像上传失败: "+e.getMessage());
            throw new IOException("头像上传失败: " + e.getMessage(), e);
        }
    }


    private static String generateAvatarUrl(String encryptedFileName) {
        return  endpoint+ "/" + "avatar" + "/" + encryptedFileName;
    }

    @Override
    public String uploadImage(MultipartFile file, String prefix) throws IOException {
        try {
            String ext = FileOperation.getFileExtension(file);
            if (ext == null || ext.isEmpty()) ext = "png";
            String objectKey = prefix + "/" + UUID.randomUUID().toString().replace("-", "") + "." + ext;
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket("avatar")
                    .object(objectKey)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());
            return endpoint + "/" + "avatar" + "/" + objectKey;
        } catch (Exception e) {
            logger.error("图片上传失败: " + e.getMessage());
            throw new IOException("图片上传失败: " + e.getMessage(), e);
        }
    }
}
