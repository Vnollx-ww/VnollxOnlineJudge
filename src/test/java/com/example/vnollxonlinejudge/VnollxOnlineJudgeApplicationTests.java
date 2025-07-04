package com.example.vnollxonlinejudge;

import com.google.common.base.Charsets;
import com.google.common.hash.BloomFilter;
import com.google.common.hash.Funnels;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@SpringBootTest
class VnollxOnlineJudgeApplicationTests {

    private static final int DEFAULT_SIZE = 1000000;
    /**
     * 自定义误判率，默认0.03，区间（0,1）
     */
    private static final double FPP = 0.02;
    public static void main(String[] args) {
        //初始化一个存储string数据的布隆过滤器,默认误判率是0.03
        BloomFilter<String> bf = BloomFilter.create(Funnels.stringFunnel(Charsets.UTF_8), DEFAULT_SIZE, FPP);
        //用于存放所有实际存在的key，用于是否存在
        Set<String> sets = new HashSet<>(DEFAULT_SIZE);
        //用于存放所有实际存在的key，用于取出
        List<String> lists = new ArrayList<>(DEFAULT_SIZE);
        //插入随机字符串
        for (int i = 0; i < DEFAULT_SIZE; i++) {
            String uuid = UUID.randomUUID().toString();
            //添加数据
            bf.put(uuid);
            sets.add(uuid);
            lists.add(uuid);
        }
        int rightNum = 0;
        int wrongNum = 0;
        for (int i = 0; i < 10000; i++) {
            // 0-10000之间，可以被100整除的数有100个（100的倍数）
            String data = i % 100 == 0 ? lists.get(i / 100) : UUID.randomUUID().toString();
            //这里用了might,看上去不是很自信，所以如果布隆过滤器判断存在了,我们还要去sets中实锤
            if (bf.mightContain(data)) {
                if (sets.contains(data)) {
                    rightNum++;
                    continue;
                }
                wrongNum++;
            }
        }
        BigDecimal percent = new BigDecimal(wrongNum).divide(new BigDecimal(9900), 2, RoundingMode.HALF_UP);
        BigDecimal bingo = new BigDecimal(9900 - wrongNum).divide(new BigDecimal(9900), 2, RoundingMode.HALF_UP);
        System.out.println("在100W个元素中，判断100个实际存在的元素，布隆过滤器认为存在的：" + rightNum);
        System.out.println("在100W个元素中，判断9900个实际不存在的元素，误认为存在的：" + wrongNum + "，命中率：" + bingo + "，误判率：" + percent);
    }
}
