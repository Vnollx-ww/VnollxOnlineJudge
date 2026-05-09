package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.admin.AdminCompetitionTeamDTO;
import com.example.vnollxonlinejudge.model.entity.CompetitionTeam;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionTeamVo;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface CompetitionTeamService {
    void saveTeam(AdminCompetitionTeamDTO req);
    void importTeams(Long competitionId, List<AdminCompetitionTeamDTO> teams);
    void importTeamsFromExcel(Long competitionId, MultipartFile file);
    List<CompetitionTeamVo> getTeams(Long competitionId);
    CompetitionTeam getTeamByMember(Long competitionId, Long userId);
    CompetitionTeamVo getTeamVoById(Long teamId);
    void deleteTeam(Long teamId);
    void deleteCompetition(Long competitionId);
}
