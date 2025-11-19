package com.example.vnollxonlinejudge.utils;

public class SnowflakeIdGenerator {
    private final long epoch = 1609459200000L; // 自定义起始时间 2021-01-01
    private final long machineId;
    private final static long MACHINE_BITS = 10L;
    private final static long SEQUENCE_BITS = 12L;

    private final static long MAX_MACHINE_ID = (1L << MACHINE_BITS) - 1;
    private final static long MAX_SEQUENCE = (1L << SEQUENCE_BITS) - 1;

    private final static long MACHINE_SHIFT = SEQUENCE_BITS;
    private final static long TIMESTAMP_SHIFT = SEQUENCE_BITS + MACHINE_BITS;

    private long lastTimestamp = -1L;
    private long sequence = 0L;

    public SnowflakeIdGenerator(long machineId) {
        if (machineId < 0 || machineId > MAX_MACHINE_ID) {
            throw new IllegalArgumentException("machineId out of range");
        }
        this.machineId = machineId;
    }

    public synchronized long nextId() {
        long timestamp = currentTime();
        if (timestamp < lastTimestamp) {
            // 时钟回拨处理（可抛异常或等待）
            throw new RuntimeException("Clock moved backwards. Refusing to generate id for " + (lastTimestamp - timestamp) + "ms");
        }
        if (timestamp == lastTimestamp) {
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) {
                // 序列用尽，等待下一个毫秒
                timestamp = waitNextMillis(lastTimestamp);
            }
        } else {
            sequence = 0L;
        }
        lastTimestamp = timestamp;
        return ((timestamp - epoch) << TIMESTAMP_SHIFT) | (machineId << MACHINE_SHIFT) | sequence;
    }

    private long waitNextMillis(long last) {
        long ts = currentTime();
        while (ts <= last) {
            ts = currentTime();
        }
        return ts;
    }

    private long currentTime() {
        return System.currentTimeMillis();
    }

    // 工具：根据主机信息生成机器 id（示例，非绝对唯一）
    public static long defaultMachineId() {
        String host = java.net.InetAddress.getLoopbackAddress().getHostAddress();
        return Math.abs(host.hashCode()) & ((1 << MACHINE_BITS) - 1);
    }
}
