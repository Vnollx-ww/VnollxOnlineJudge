
package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.service.TestCaseCacheService;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

@Service
public class TestCaseCacheServiceImpl implements TestCaseCacheService {

    private static final Logger logger = LoggerFactory.getLogger(TestCaseCacheServiceImpl.class);
    private static final String MINIO_BUCKET_NAME = "problem";

    private final MinioClient minioClient;
    private Cache<String, List<String[]>> testCaseCache;

    @Autowired
    public TestCaseCacheServiceImpl(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    @PostConstruct
    public void initCache() {
        this.testCaseCache = Caffeine.newBuilder()
                .maximumSize(1000) // 最多缓存1000个测试用例文件
                .expireAfterWrite(Duration.ofHours(6)) // 6小时后过期
                .expireAfterAccess(Duration.ofHours(2)) // 2小时未访问后过期
                .recordStats() // 启用统计信息
                .build();

        logger.info("Caffeine测试用例缓存初始化完成");
    }
    /**
     * 获取测试用例，优先从缓存获取，缓存未命中时从MinIO下载
     */
    @Override
    public List<String[]> getTestCases(String zipFilePath) {
        return testCaseCache.get(zipFilePath, key -> {
            try {
                logger.info("缓存未命中，从MinIO下载测试用例: {}", zipFilePath);
                return downloadAndParseTestCases(zipFilePath);
            } catch (Exception e) {
                logger.error("从MinIO下载测试用例失败: {}", zipFilePath, e);
                return new ArrayList<>();
            }
        });
    }
    /**
     * 从MinIO下载并解析测试用例
     */
    private List<String[]> downloadAndParseTestCases(String zipFilePath) throws Exception {
        // 从 MinIO 下载测试用例压缩包
        InputStream zipStream = minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(MINIO_BUCKET_NAME)
                        .object(zipFilePath)
                        .build());

        // 保存到临时文件
        Path tempZipPath = Files.createTempFile("testcases", ".zip");
        try {
            Files.copy(zipStream, tempZipPath, StandardCopyOption.REPLACE_EXISTING);

            // 读取测试用例
            List<String[]> testCases = readTestCasesFromZip(tempZipPath.toString());
            logger.info("成功从MinIO下载并解析测试用例: {}, 共{}个测试点", zipFilePath, testCases.size());

            return testCases;
        } finally {
            // 清理临时文件
            try {
                Files.deleteIfExists(tempZipPath);
            } catch (Exception e) {
                logger.warn("删除临时文件失败: {}", tempZipPath, e);
            }
        }
    }

    private List<String[]> readTestCasesFromZip(String zipPath) throws IOException {
        List<String[]> testCases = new ArrayList<>();
        try (ZipFile zipFile = new ZipFile(zipPath)) {
            int i = 1;
            while (true) {
                String inputFile = i + ".in";
                String outputFile = i + ".out";

                ZipEntry inputEntry = zipFile.getEntry(inputFile);
                ZipEntry outputEntry = zipFile.getEntry(outputFile);

                if (inputEntry == null || outputEntry == null) {
                    break;
                }

                String input = readFileFromZip(zipFile, inputFile);
                String output = readFileFromZip(zipFile, outputFile);

                testCases.add(new String[]{input, output});
                i++;
            }
        }
        return testCases;
    }

    private String readFileFromZip(ZipFile zipFile, String entryName) throws IOException {
        StringBuilder content = new StringBuilder();
        ZipEntry entry = zipFile.getEntry(entryName);
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(zipFile.getInputStream(entry)))) {
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }
        }
        return content.toString().trim();
    }
    /**
     * 获取缓存统计信息
     */
    public Map<String, Object> getCacheStats() {
        var stats = testCaseCache.stats();
        Map<String, Object> statsMap = new HashMap<>();
        statsMap.put("requestCount", stats.requestCount());
        statsMap.put("hitCount", stats.hitCount());
        statsMap.put("missCount", stats.missCount());
        statsMap.put("hitRate", stats.hitRate());
        statsMap.put("evictionCount", stats.evictionCount());
        statsMap.put("estimatedSize", testCaseCache.estimatedSize());
        return statsMap;
    }

    /**
     * 异步预加载测试用例到缓存
     */
    public CompletableFuture<Void> preloadTestCases(List<String> zipFilePaths) {
        return CompletableFuture.runAsync(() -> {
            for (String zipFilePath : zipFilePaths) {
                try {
                    getTestCases(zipFilePath);
                    logger.info("预加载测试用例成功: {}", zipFilePath);
                } catch (Exception e) {
                    logger.error("预加载测试用例失败: {}", zipFilePath, e);
                }
            }
        });
    }

    /**
     * 手动清理缓存中的指定项
     */
    @Override
    public void evictFromCache(String zipFilePath) {
        testCaseCache.invalidate(zipFilePath);
        logger.info("已从缓存中移除测试用例: {}", zipFilePath);
    }

    /**
     * 清空所有缓存
     */
    public void clearCache() {
        testCaseCache.invalidateAll();
        logger.info("已清空所有测试用例缓存");
    }
}
