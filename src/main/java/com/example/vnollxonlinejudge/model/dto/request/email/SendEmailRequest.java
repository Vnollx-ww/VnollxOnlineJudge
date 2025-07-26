package com.example.vnollxonlinejudge.model.dto.request.email;

import lombok.Data;

@Data
public class SendEmailRequest {
    private String email;
    private String option;
}
