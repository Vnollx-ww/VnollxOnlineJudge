package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@TableName("competition_team")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitionTeam {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("competition_id")
    private Long competitionId;
    @TableField("team_name")
    private String teamName;
    @TableField("leader_name")
    private String leaderName;
    @TableField("phone")
    private String phone;
    @TableField("email")
    private String email;
    @TableField("is_female_team")
    private Boolean femaleTeam;
    @TableField("school")
    private String school;
    @TableField("created_at")
    private String createdAt;
}
