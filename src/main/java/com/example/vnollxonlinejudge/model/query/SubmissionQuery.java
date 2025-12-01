package com.example.vnollxonlinejudge.model.query;

import lombok.Data;

@Data
public class SubmissionQuery {
    private Long cid=0L;
    private Long uid=0L;
    private String language;
    private String status;
    private String keyword;
    private Integer pageNum;
    private Integer pageSize;
}
