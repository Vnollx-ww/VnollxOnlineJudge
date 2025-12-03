package com.example.vnollxonlinejudge.model.dto.judge;

import lombok.Data;


@Data
public class SubmitCodeDTO {
    private String code;
    private String option;
    private String pid;
    private String title;
    private String userName;
    private String userPenaltyKey;
    private String uname;
    private String cid;
    private String create_time;
    private String time;
    private String memory;
}
