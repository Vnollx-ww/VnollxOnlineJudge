package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.CompetitionTeamMapper;
import com.example.vnollxonlinejudge.mapper.CompetitionTeamMemberMapper;
import com.example.vnollxonlinejudge.mapper.UserMapper;
import com.example.vnollxonlinejudge.model.dto.admin.AdminCompetitionTeamDTO;
import com.example.vnollxonlinejudge.model.entity.CompetitionTeam;
import com.example.vnollxonlinejudge.model.entity.CompetitionTeamMember;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.vo.competition.CompetitionTeamVo;
import com.example.vnollxonlinejudge.service.CompetitionService;
import com.example.vnollxonlinejudge.service.CompetitionTeamService;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CompetitionTeamServiceImpl extends ServiceImpl<CompetitionTeamMapper, CompetitionTeam> implements CompetitionTeamService {
    private final CompetitionTeamMemberMapper competitionTeamMemberMapper;
    private final UserMapper userMapper;
    private final CompetitionService competitionService;

    @Autowired
    public CompetitionTeamServiceImpl(
            CompetitionTeamMemberMapper competitionTeamMemberMapper,
            UserMapper userMapper,
            @Lazy CompetitionService competitionService
    ) {
        this.competitionTeamMemberMapper = competitionTeamMemberMapper;
        this.userMapper = userMapper;
        this.competitionService = competitionService;
    }

    @Override
    @Transactional
    public void saveTeam(AdminCompetitionTeamDTO req) {
        validateTeam(req);
        Long competitionId = req.getCompetitionId();
        CompetitionTeam sameName = lambdaQuery()
                .eq(CompetitionTeam::getCompetitionId, competitionId)
                .eq(CompetitionTeam::getTeamName, req.getTeamName())
                .ne(req.getId() != null, CompetitionTeam::getId, req.getId())
                .one();
        if (sameName != null) {
            throw new BusinessException("同一场比赛中队名不能重复");
        }
        String email = normalizeEmail(req.getEmail());
        CompetitionTeam sameEmail = lambdaQuery()
                .eq(CompetitionTeam::getCompetitionId, competitionId)
                .eq(CompetitionTeam::getEmail, email)
                .ne(req.getId() != null, CompetitionTeam::getId, req.getId())
                .one();
        if (sameEmail != null) {
            throw new BusinessException("同一场比赛中队伍邮箱不能重复");
        }

        CompetitionTeam team = req.getId() == null ? new CompetitionTeam() : getById(req.getId());
        if (team == null) {
            throw new BusinessException("队伍不存在");
        }
        boolean created = req.getId() == null;
        team.setCompetitionId(competitionId);
        team.setTeamName(req.getTeamName().trim());
        team.setLeaderName(trimToNull(req.getLeaderName()));
        team.setPhone(trimToNull(req.getPhone()));
        team.setEmail(email);
        team.setFemaleTeam(Boolean.TRUE.equals(req.getFemaleTeam()));
        team.setSchool(req.getSchool());
        if (created) {
            team.setCreatedAt(now());
            save(team);
            if (team.getId() == null) {
                team = getTeamByCompetitionAndName(competitionId, team.getTeamName());
            }
            competitionService.addNumber(competitionId);
        } else {
            updateById(team);
            QueryWrapper<CompetitionTeamMember> deleteWrapper = new QueryWrapper<>();
            deleteWrapper.eq("team_id", team.getId());
            competitionTeamMemberMapper.delete(deleteWrapper);
        }
        if (team == null || team.getId() == null) {
            throw new BusinessException("队伍保存失败，无法获取队伍 ID");
        }

        saveMembers(competitionId, team.getId(), req.getMembers());
    }

    @Override
    @Transactional
    public void importTeams(Long competitionId, List<AdminCompetitionTeamDTO> teams) {
        if (teams == null || teams.isEmpty()) {
            throw new BusinessException("导入队伍不能为空");
        }
        List<AdminCompetitionTeamDTO> normalizedTeams = new ArrayList<>();
        Set<String> importTeamNames = new HashSet<>();
        Set<String> importEmails = new HashSet<>();
        for (AdminCompetitionTeamDTO team : teams) {
            team.setCompetitionId(competitionId);
            validateTeam(team);
            team.setTeamName(trimToNull(team.getTeamName()));
            team.setLeaderName(trimToNull(team.getLeaderName()));
            team.setPhone(trimToNull(team.getPhone()));
            team.setEmail(normalizeEmail(team.getEmail()));
            team.setSchool(trimToNull(team.getSchool()));
            if (!importTeamNames.add(team.getTeamName())) {
                throw new BusinessException("导入数据中队名重复：" + team.getTeamName());
            }
            if (!importEmails.add(team.getEmail())) {
                throw new BusinessException("导入数据中队伍邮箱重复：" + team.getEmail());
            }
            normalizedTeams.add(team);
        }

        List<CompetitionTeam> existingTeams = lambdaQuery()
                .eq(CompetitionTeam::getCompetitionId, competitionId)
                .and(wrapper -> wrapper.in(CompetitionTeam::getTeamName, importTeamNames).or().in(CompetitionTeam::getEmail, importEmails))
                .list();
        if (!existingTeams.isEmpty()) {
            CompetitionTeam existingTeam = existingTeams.get(0);
            if (importTeamNames.contains(existingTeam.getTeamName())) {
                throw new BusinessException("同一场比赛中队名不能重复：" + existingTeam.getTeamName());
            }
            throw new BusinessException("同一场比赛中队伍邮箱不能重复：" + existingTeam.getEmail());
        }

        String now = now();
        List<CompetitionTeam> teamEntities = normalizedTeams.stream()
                .map(req -> {
                    CompetitionTeam team = new CompetitionTeam();
                    team.setCompetitionId(competitionId);
                    team.setTeamName(req.getTeamName());
                    team.setLeaderName(req.getLeaderName());
                    team.setPhone(req.getPhone());
                    team.setEmail(req.getEmail());
                    team.setFemaleTeam(Boolean.TRUE.equals(req.getFemaleTeam()));
                    team.setSchool(req.getSchool());
                    team.setCreatedAt(now);
                    return team;
                })
                .collect(Collectors.toList());
        saveBatch(teamEntities);
        competitionService.addNumber(competitionId, teamEntities.size());

        List<CompetitionTeam> savedTeams = lambdaQuery()
                .eq(CompetitionTeam::getCompetitionId, competitionId)
                .in(CompetitionTeam::getTeamName, importTeamNames)
                .list();
        Map<String, Long> teamIdMap = new HashMap<>();
        for (CompetitionTeam team : savedTeams) {
            teamIdMap.put(team.getTeamName(), team.getId());
        }

        List<CompetitionTeamMember> members = new ArrayList<>();
        for (AdminCompetitionTeamDTO req : normalizedTeams) {
            Long teamId = teamIdMap.get(req.getTeamName());
            if (teamId == null) {
                throw new BusinessException("队伍保存失败，无法获取队伍 ID：" + req.getTeamName());
            }
            members.addAll(buildMembers(competitionId, teamId, req.getMembers(), now));
        }
        if (!members.isEmpty()) {
            competitionTeamMemberMapper.insertBatch(members);
        }
    }

    @Override
    @Transactional
    public void importTeamsFromExcel(Long competitionId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("请选择要导入的 Excel 文件");
        }
        String fileName = file.getOriginalFilename();
        if (fileName == null || !fileName.toLowerCase().endsWith(".xlsx")) {
            throw new BusinessException("仅支持 .xlsx 文件");
        }
        List<AdminCompetitionTeamDTO> teams = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();
        try (InputStream inputStream = file.getInputStream(); Workbook workbook = new XSSFWorkbook(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new BusinessException("Excel 文件没有工作表");
            }
            for (int rowIndex = 3; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) {
                    continue;
                }
                String teamName = cellString(row, 1, formatter);
                if (teamName == null || teamName.isEmpty()) {
                    continue;
                }
                AdminCompetitionTeamDTO team = new AdminCompetitionTeamDTO();
                team.setCompetitionId(competitionId);
                team.setTeamName(teamName);
                team.setLeaderName(cellString(row, 2, formatter));
                team.setPhone(cellString(row, 3, formatter));
                team.setEmail(normalizeEmail(cellString(row, 4, formatter)));
                team.setMember2Name(cellString(row, 5, formatter));
                team.setMember3Name(cellString(row, 6, formatter));
                team.setFemaleTeam("是".equals(cellString(row, 7, formatter)));
                validateExcelRow(rowIndex + 1, team);
                teams.add(team);
            }
        } catch (IOException e) {
            throw new BusinessException("读取 Excel 文件失败");
        }
        if (teams.isEmpty()) {
            throw new BusinessException("Excel 中没有可导入的队伍数据");
        }
        importTeams(competitionId, teams);
    }

    @Override
    public List<CompetitionTeamVo> getTeams(Long competitionId) {
        return lambdaQuery()
                .eq(CompetitionTeam::getCompetitionId, competitionId)
                .list()
                .stream()
                .map(this::toVo)
                .collect(Collectors.toList());
    }

    @Override
    public CompetitionTeam getTeamByMember(Long competitionId, Long userId) {
        if (competitionId == null || userId == null) {
            return null;
        }
        User user = userMapper.selectById(userId);
        String email = user == null ? null : normalizeEmail(user.getEmail());
        if (email == null) {
            return null;
        }
        return lambdaQuery()
                .eq(CompetitionTeam::getCompetitionId, competitionId)
                .eq(CompetitionTeam::getEmail, email)
                .one();
    }

    @Override
    public CompetitionTeamVo getTeamVoById(Long teamId) {
        CompetitionTeam team = getById(teamId);
        return team == null ? null : toVo(team);
    }

    @Override
    @Transactional
    public void deleteTeam(Long teamId) {
        CompetitionTeam team = getById(teamId);
        if (team == null) {
            return;
        }
        QueryWrapper<CompetitionTeamMember> wrapper = new QueryWrapper<>();
        wrapper.eq("team_id", teamId);
        competitionTeamMemberMapper.delete(wrapper);
        removeById(teamId);
    }

    @Override
    @Transactional
    public void deleteCompetition(Long competitionId) {
        QueryWrapper<CompetitionTeamMember> memberWrapper = new QueryWrapper<>();
        memberWrapper.eq("competition_id", competitionId);
        competitionTeamMemberMapper.delete(memberWrapper);
        QueryWrapper<CompetitionTeam> teamWrapper = new QueryWrapper<>();
        teamWrapper.eq("competition_id", competitionId);
        this.baseMapper.delete(teamWrapper);
    }

    private void validateTeam(AdminCompetitionTeamDTO req) {
        if (req == null || req.getCompetitionId() == null) {
            throw new BusinessException("比赛 ID 不能为空");
        }
        if (req.getTeamName() == null || req.getTeamName().trim().isEmpty()) {
            throw new BusinessException("队名不能为空");
        }
        normalizeImportMembers(req);
        if (req.getMembers() == null || req.getMembers().isEmpty() || req.getMembers().size() > 3) {
            throw new BusinessException("每个队伍成员数必须为 1 到 3 人");
        }
    }

    private void validateExcelRow(int rowNumber, AdminCompetitionTeamDTO team) {
        if (trimToNull(team.getTeamName()) == null) {
            throw new BusinessException("第 " + rowNumber + " 行团队名称不能为空");
        }
        if (trimToNull(team.getLeaderName()) == null) {
            throw new BusinessException("第 " + rowNumber + " 行队员1姓名不能为空");
        }
        if (trimToNull(team.getPhone()) == null) {
            throw new BusinessException("第 " + rowNumber + " 行手机号不能为空");
        }
        if (trimToNull(team.getEmail()) == null) {
            throw new BusinessException("第 " + rowNumber + " 行 Email 不能为空");
        }
        if (!team.getEmail().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new BusinessException("第 " + rowNumber + " 行 Email 格式不正确");
        }
    }

    private String cellString(Row row, int index, DataFormatter formatter) {
        Cell cell = row.getCell(index);
        return trimToNull(formatter.formatCellValue(cell));
    }

    private void normalizeImportMembers(AdminCompetitionTeamDTO req) {
        if (req.getMembers() != null && !req.getMembers().isEmpty()) {
            return;
        }
        List<AdminCompetitionTeamDTO.MemberDTO> members = new ArrayList<>();
        addMemberByNameOrEmail(members, req.getLeaderName(), normalizeEmail(req.getEmail()), true);
        addMemberByNameOrEmail(members, req.getMember2Name(), null, false);
        addMemberByNameOrEmail(members, req.getMember3Name(), null, false);
        req.setMembers(members);
    }

    private void addMemberByNameOrEmail(List<AdminCompetitionTeamDTO.MemberDTO> members, String realName, String email, boolean leader) {
        String name = trimToNull(realName);
        if (name == null && email == null) {
            if (leader) {
                throw new BusinessException("队员1姓名不能为空");
            }
            return;
        }
        AdminCompetitionTeamDTO.MemberDTO member = new AdminCompetitionTeamDTO.MemberDTO();
        member.setRealName(name);
        members.add(member);
    }

    private void saveMembers(Long competitionId, Long teamId, List<AdminCompetitionTeamDTO.MemberDTO> members) {
        if (teamId == null) {
            throw new BusinessException("队伍 ID 不能为空");
        }
        List<CompetitionTeamMember> memberEntities = buildMembers(competitionId, teamId, members, now());
        if (!memberEntities.isEmpty()) {
            competitionTeamMemberMapper.insertBatch(memberEntities);
        }
    }

    private List<CompetitionTeamMember> buildMembers(Long competitionId, Long teamId, List<AdminCompetitionTeamDTO.MemberDTO> members, String now) {
        List<CompetitionTeamMember> memberEntities = new ArrayList<>();
        for (AdminCompetitionTeamDTO.MemberDTO memberReq : members) {
            CompetitionTeamMember member = new CompetitionTeamMember();
            member.setCompetitionId(competitionId);
            member.setTeamId(teamId);
            member.setRealName(memberReq.getRealName());
            member.setCreatedAt(now);
            memberEntities.add(member);
        }
        return memberEntities;
    }

    private CompetitionTeam getTeamByCompetitionAndName(Long competitionId, String teamName) {
        return lambdaQuery()
                .eq(CompetitionTeam::getCompetitionId, competitionId)
                .eq(CompetitionTeam::getTeamName, teamName)
                .one();
    }

    private CompetitionTeamVo toVo(CompetitionTeam team) {
        CompetitionTeamVo vo = new CompetitionTeamVo();
        vo.setId(team.getId());
        vo.setCompetitionId(team.getCompetitionId());
        vo.setTeamName(team.getTeamName());
        vo.setLeaderName(team.getLeaderName());
        vo.setPhone(team.getPhone());
        vo.setEmail(team.getEmail());
        vo.setFemaleTeam(team.getFemaleTeam());
        vo.setSchool(team.getSchool());
        QueryWrapper<CompetitionTeamMember> wrapper = new QueryWrapper<>();
        wrapper.eq("team_id", team.getId()).orderByAsc("id");
        List<CompetitionTeamVo.MemberVo> members = new ArrayList<>();
        for (CompetitionTeamMember member : competitionTeamMemberMapper.selectList(wrapper)) {
            CompetitionTeamVo.MemberVo memberVo = new CompetitionTeamVo.MemberVo();
            memberVo.setRealName(member.getRealName());
            members.add(memberVo);
        }
        vo.setMembers(members);
        return vo;
    }

    private String now() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeEmail(String email) {
        String value = trimToNull(email);
        return value == null ? null : value.toLowerCase();
    }
}
