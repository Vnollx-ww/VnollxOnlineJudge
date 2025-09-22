package com.example.vnollxonlinejudge.filter;


import com.example.vnollxonlinejudge.service.ProblemService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.util.BitSet;
import java.util.List;

@Component
public class BloomFilter {

    private static final Logger logger = LoggerFactory.getLogger(BloomFilter.class);
    private static final int DEFAULT_SIZE = 2 << 24; // 约1600万位
    private static final int[] SEEDS = new int[]{3, 5, 7, 11, 13, 31, 37, 61};

    private final BitSet bits = new BitSet(DEFAULT_SIZE);
    private final SimpleHash[] func = new SimpleHash[SEEDS.length];

    @Autowired
    private ProblemService problemService;

    public BloomFilter() {
        logger.info("布隆过滤器初始化中...");
        for (int i = 0; i < SEEDS.length; i++) {
            func[i] = new SimpleHash(DEFAULT_SIZE, SEEDS[i]);
        }
    }

    @PostConstruct
    public void init() {
        logger.info("开始加载题目数据到布隆过滤器...");
        try {
            loadAllProducts();
        } catch (Exception e) {
            logger.error("布隆过滤器初始化失败", e);
            throw new RuntimeException("布隆过滤器初始化失败", e);
        }
    }

    /**
     * 加载所有题目到布隆过滤器
     */
    private void loadAllProducts() {
        try {
            List<Long> idList = problemService.getAllProblemId();
            if (idList.isEmpty()) {
                logger.warn("未找到题目数据");
                return;
            }

            logger.info("找到 {} 个题目，正在添加到布隆过滤器...", idList.size());
            int count = 0;
            for (Long id : idList) {
                add(String.valueOf(id));
                count++;

                // 每1000个题目打印一次日志
                if (count % 1000 == 0) {
                    logger.info("已处理 {} 个题目", count);
                }
            }
            logger.info("共处理 {} 个题目到布隆过滤器", count);

        } catch (Exception e) {
            logger.error("加载题目数据到布隆过滤器失败", e);
            throw new RuntimeException("加载题目数据失败", e);
        }
    }

    // 其他方法保持不变...
    public void add(String value) {
        if (value == null) return;

        for (SimpleHash f : func) {
            bits.set(f.hash(value), true);
        }
    }

    public boolean contains(String value) {
        if (value == null) return false;

        boolean ret = true;
        for (SimpleHash f : func) {
            ret = ret && bits.get(f.hash(value));
        }
        return ret;
    }

    public double getFillRatio() {
        int count = 0;
        for (int i = 0; i < DEFAULT_SIZE; i++) {
            if (bits.get(i)) {
                count++;
            }
        }
        return (double) count / DEFAULT_SIZE;
    }

    public static class SimpleHash {
        private final int cap;
        private final int seed;

        public SimpleHash(int cap, int seed) {
            this.cap = cap;
            this.seed = seed;
        }

        public int hash(String value) {
            int result = 0;
            int len = value.length();
            for (int i = 0; i < len; i++) {
                result = seed * result + value.charAt(i);
            }
            return (cap - 1) & result;
        }
    }
}