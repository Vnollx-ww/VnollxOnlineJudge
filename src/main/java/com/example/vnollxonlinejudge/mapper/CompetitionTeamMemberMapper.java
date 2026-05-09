package com.example.vnollxonlinejudge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.vnollxonlinejudge.model.entity.CompetitionTeamMember;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CompetitionTeamMemberMapper extends BaseMapper<CompetitionTeamMember> {
    @Insert({
            "<script>",
            "insert into competition_team_member (competition_id, team_id, real_name, created_at) values",
            "<foreach collection='members' item='member' separator=','>",
            "(#{member.competitionId}, #{member.teamId}, #{member.realName}, #{member.createdAt})",
            "</foreach>",
            "</script>"
    })
    void insertBatch(@Param("members") List<CompetitionTeamMember> members);
}
