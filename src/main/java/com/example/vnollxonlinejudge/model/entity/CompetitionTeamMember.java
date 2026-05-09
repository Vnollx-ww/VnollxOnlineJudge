package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@TableName("competition_team_member")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitionTeamMember {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("competition_id")
    private Long competitionId;
    @TableField("team_id")
    private Long teamId;
    @TableField("real_name")
    private String realName;
    @TableField("created_at")
    private String createdAt;
}
