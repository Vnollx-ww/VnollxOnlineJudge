package com.example.vnollxonlinejudge.model.vo.competition;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CompetitionTeamVo {
    private Long id;
    private Long competitionId;
    private String teamName;
    private String leaderName;
    private String phone;
    private String email;
    private Boolean femaleTeam;
    private String school;
    private List<MemberVo> members = new ArrayList<>();

    @Data
    public static class MemberVo {
        private String realName;
    }
}
