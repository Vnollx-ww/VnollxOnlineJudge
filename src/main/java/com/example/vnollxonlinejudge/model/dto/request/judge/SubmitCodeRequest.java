package com.example.vnollxonlinejudge.model.dto.request.judge;

import lombok.Data;


@Data
public class SubmitCodeRequest {
    String code;
    String option;
    String pid;
    String uname;
    String cid;
    String create_time;
    String time;
    String memory;
}
