package com.example.vnollxonlinejudge.model.vo.competition;

import lombok.Data;

import java.util.List;

@Data
public class AntiCheatUserDetailVo {
    private AntiCheatSummaryVo summary;
    private List<AntiCheatEventVo> events;
}
