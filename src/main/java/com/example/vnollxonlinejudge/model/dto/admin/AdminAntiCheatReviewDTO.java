package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.Data;

@Data
public class AdminAntiCheatReviewDTO {
    /** PENDING/CONFIRMED/REJECTED/IGNORED */
    private String reviewStatus;
    /** NORMAL/WARNING/CHEATING/NEED_MORE_EVIDENCE */
    private String reviewResult;
    private String reviewNote;
}
