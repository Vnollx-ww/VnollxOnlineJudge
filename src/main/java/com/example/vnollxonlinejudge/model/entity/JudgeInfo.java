package com.example.vnollxonlinejudge.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JudgeInfo {
    private String code;
    private String language;
    private Long time;
    private Long memory;
    private Long cid;
    private Long uid;
    private Long pid;
    private String uname;

    private String createTime;
}
