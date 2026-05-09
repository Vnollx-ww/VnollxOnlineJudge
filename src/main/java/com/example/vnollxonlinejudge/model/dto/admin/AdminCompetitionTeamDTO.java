package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AdminCompetitionTeamDTO {
    private Long id;
    private Long competitionId;
    private String teamName;
    private String school;
    private String leaderName;
    private String phone;
    private String email;
    private String member2Name;
    private String member3Name;
    private Boolean femaleTeam;
    private List<MemberDTO> members = new ArrayList<>();

    @Data
    public static class MemberDTO {
        private String realName;
    }
}
